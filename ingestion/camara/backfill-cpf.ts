import { and, eq, isNull } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { fetchJson } from './camara-client'
import { mapDeputadoDetalheCpf } from './cpf-mapper'
import { camaraDeputadoDetalheSchema } from './deputado-detalhe-schema'

// Enriquece `parlamentar.cpf` dos deputados da Câmara via GET /deputados/{id}
// (a listagem não traz CPF). É o pré-requisito do vínculo TSE (Eixo 2 / Inc 0):
// sem CPF na ponta `parlamentar`, o join CPF-exato com candidaturas do TSE
// casa zero linhas. Senado NÃO expõe CPF — fora do escopo (Camada A é
// Câmara-only neste incremento).
//
// Idempotente e barato em reruns: processa só linhas com cpf IS NULL.

const CASA = 'CAMARA' as const
const CONCURRENCY = 5

interface BackfillStats {
  candidatos: number
  fetched: number
  preenchidos: number
  semCpf: number
  errors: Array<{ sourceId: string; reason: string }>
}

async function loadDeputadosSemCpf(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(and(eq(parlamentar.casa, CASA), isNull(parlamentar.cpf)))
}

async function processDeputado(
  dep: { id: string; sourceId: string },
  stats: BackfillStats,
): Promise<void> {
  try {
    const raw = await fetchJson(`/deputados/${dep.sourceId}`)
    stats.fetched++
    const parsed = camaraDeputadoDetalheSchema.safeParse(raw)
    if (!parsed.success) {
      stats.errors.push({
        sourceId: dep.sourceId,
        reason: parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      })
      return
    }

    const { cpf } = mapDeputadoDetalheCpf(parsed.data)
    if (cpf === null) {
      stats.semCpf++
      return
    }

    await db.update(parlamentar).set({ cpf }).where(eq(parlamentar.id, dep.id))
    stats.preenchidos++
  } catch (err) {
    stats.errors.push({
      sourceId: dep.sourceId,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function backfillCpfCamara(): Promise<BackfillStats> {
  const deputados = await loadDeputadosSemCpf()

  const stats: BackfillStats = {
    candidatos: deputados.length,
    fetched: 0,
    preenchidos: 0,
    semCpf: 0,
    errors: [],
  }

  await runWithConcurrency(
    deputados,
    async (dep) => {
      await processDeputado(dep, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
backfillCpfCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'backfill_cpf_camara_done',
        durationMs,
        candidatos: stats.candidatos,
        fetched: stats.fetched,
        preenchidos: stats.preenchidos,
        semCpf: stats.semCpf,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Política unificada: só falha se houve erros E zero sucessos.
    process.exit(stats.errors.length > 0 && stats.preenchidos === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'backfill_cpf_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
