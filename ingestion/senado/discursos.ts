import { eq } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { formatDateSP } from '../shared/dates'
import { db } from '../shared/db'
import { persistDiscursos } from '../shared/discurso'
import { mapDiscursosSenado } from './discursos-mapper'
import {
  extractPronunciamentos,
  senadoDiscursosRespostaSchema,
} from './discursos-schema'
import { fetchSenadoJson } from './senado-client'

// Discursos dos senadores (#504), cobertura da legislatura atual (2023+).
// O texto integral fica em `UrlTexto` (não inline) → guardamos metadados +
// TextoResumo + URL (ADR-016). Idempotente: substitui em massa por senador.

const CASA = 'SENADO' as const
const CONCURRENCY = 3
const INICIO_COMPACT = '20230201'

interface IngestionStats {
  candidatos: number
  fetched: number
  comDiscurso: number
  discursosUpserted: number
  errors: Array<{ context: string; reason: string }>
}

export async function ingestDiscursosSenado(): Promise<IngestionStats> {
  const senadores = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))

  const dataFim = formatDateSP(new Date(), true) // YYYYMMDD
  const stats: IngestionStats = {
    candidatos: senadores.length,
    fetched: 0,
    comDiscurso: 0,
    discursosUpserted: 0,
    errors: [],
  }

  await runWithConcurrency(
    senadores,
    async (sen) => {
      try {
        const raw = await fetchSenadoJson<unknown>(
          `/senador/${sen.sourceId}/discursos?dataInicio=${INICIO_COMPACT}&dataFim=${dataFim}`,
        )
        stats.fetched++
        const parsed = senadoDiscursosRespostaSchema.safeParse(raw)
        if (!parsed.success) {
          stats.errors.push({
            context: `discursos:${sen.sourceId}`,
            reason: parsed.error.issues.map((i) => i.message).join('; '),
          })
          return
        }
        const discursos = mapDiscursosSenado(
          extractPronunciamentos(parsed.data),
        )
        await persistDiscursos(sen.id, CASA, discursos)
        if (discursos.length > 0) stats.comDiscurso++
        stats.discursosUpserted += discursos.length
      } catch (err) {
        stats.errors.push({
          context: `discursos:${sen.sourceId}`,
          reason: err instanceof Error ? err.message : String(err),
        })
      }
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestDiscursosSenado()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_discursos_senado_done',
        durationMs: Date.now() - started,
        candidatos: stats.candidatos,
        fetched: stats.fetched,
        comDiscurso: stats.comDiscurso,
        discursosUpserted: stats.discursosUpserted,
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
        event: 'ingest_discursos_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
