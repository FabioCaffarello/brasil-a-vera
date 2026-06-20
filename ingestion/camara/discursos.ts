import { eq } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { formatDateSP } from '../shared/dates'
import { db } from '../shared/db'
import { type DiscursoMapped, persistDiscursos } from '../shared/discurso'
import { fetchJson } from './camara-client'
import { mapDiscursosCamara } from './discursos-mapper'
import { camaraDiscursosRespostaSchema } from './discursos-schema'

// Discursos dos deputados (#504), cobertura da legislatura atual (57ª, 2023+).
// Metadados + resumo + keywords; a transcrição inline é descartada (ADR-016).
// Serial + pacing como backfill-cpf; pagina por deputado (100/página).
// Idempotente: substitui em massa os discursos de cada deputado.

const CASA = 'CAMARA' as const
const CONCURRENCY = 1
const PACING_MS = 200
const LEGISLATURA_INICIO = '2023-02-01'
const ITENS = 100
const MAX_PAGINAS = 50 // safeguard: 5000 discursos/deputado

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface IngestionStats {
  candidatos: number
  fetched: number
  comDiscurso: number
  discursosUpserted: number
  paginasMaxAtingido: number
  errors: Array<{ context: string; reason: string }>
}

async function fetchDiscursosDeputado(
  sourceId: string,
  dataFim: string,
  stats: IngestionStats,
): Promise<DiscursoMapped[]> {
  const acc: DiscursoMapped[] = []
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const path = `/deputados/${sourceId}/discursos?dataInicio=${LEGISLATURA_INICIO}&dataFim=${dataFim}&ordenarPor=dataHoraInicio&ordem=ASC&itens=${ITENS}&pagina=${pagina}`
    const raw = await fetchJson(path)
    const parsed = camaraDiscursosRespostaSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((i) => i.message).join('; '))
    }
    const dados = parsed.data.dados ?? []
    acc.push(...mapDiscursosCamara(dados))
    if (dados.length < ITENS) return acc
    if (pagina === MAX_PAGINAS) stats.paginasMaxAtingido++
    await sleep(PACING_MS)
  }
  return acc
}

export async function ingestDiscursosCamara(): Promise<IngestionStats> {
  const deputados = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))

  const dataFim = formatDateSP(new Date())
  const stats: IngestionStats = {
    candidatos: deputados.length,
    fetched: 0,
    comDiscurso: 0,
    discursosUpserted: 0,
    paginasMaxAtingido: 0,
    errors: [],
  }

  await runWithConcurrency(
    deputados,
    async (dep) => {
      try {
        const discursos = await fetchDiscursosDeputado(
          dep.sourceId,
          dataFim,
          stats,
        )
        stats.fetched++
        await persistDiscursos(dep.id, CASA, discursos)
        if (discursos.length > 0) stats.comDiscurso++
        stats.discursosUpserted += discursos.length
      } catch (err) {
        stats.errors.push({
          context: `discursos:${dep.sourceId}`,
          reason: err instanceof Error ? err.message : String(err),
        })
      } finally {
        await sleep(PACING_MS)
      }
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestDiscursosCamara()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_discursos_camara_done',
        durationMs: Date.now() - started,
        candidatos: stats.candidatos,
        fetched: stats.fetched,
        comDiscurso: stats.comDiscurso,
        discursosUpserted: stats.discursosUpserted,
        paginasMaxAtingido: stats.paginasMaxAtingido,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(
      stats.errors.length > 0 && stats.discursosUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_discursos_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
