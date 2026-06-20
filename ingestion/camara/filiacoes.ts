import { eq } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { persistFiliacoes } from '../shared/filiacao'
import { fetchJson } from './camara-client'
import { collapseHistoricoToFiliacoes } from './filiacoes-mapper'
import { camaraHistoricoRespostaSchema } from './filiacoes-schema'

// Popula `filiacao_partidaria` para os deputados (#502). Deriva períodos do
// `/deputados/{id}/historico` (colapso de eventos consecutivos por partido).
//
// Serial + pacing como o backfill-cpf: o detalhe por deputado throttla bursts.
// Idempotente: substitui em massa as filiações de cada deputado.

const CASA = 'CAMARA' as const
const CONCURRENCY = 1
const PACING_MS = 200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface IngestionStats {
  candidatos: number
  fetched: number
  comFiliacao: number
  periodosUpserted: number
  errors: Array<{ context: string; reason: string }>
}

export async function ingestFiliacoesCamara(): Promise<IngestionStats> {
  const deputados = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))

  const stats: IngestionStats = {
    candidatos: deputados.length,
    fetched: 0,
    comFiliacao: 0,
    periodosUpserted: 0,
    errors: [],
  }

  await runWithConcurrency(
    deputados,
    async (dep) => {
      try {
        const raw = await fetchJson(`/deputados/${dep.sourceId}/historico`)
        stats.fetched++
        const parsed = camaraHistoricoRespostaSchema.safeParse(raw)
        if (!parsed.success) {
          stats.errors.push({
            context: `historico:${dep.sourceId}`,
            reason: parsed.error.issues.map((i) => i.message).join('; '),
          })
          return
        }
        const periodos = collapseHistoricoToFiliacoes(parsed.data.dados ?? [])
        await persistFiliacoes(dep.id, periodos)
        if (periodos.length > 0) stats.comFiliacao++
        stats.periodosUpserted += periodos.length
      } catch (err) {
        stats.errors.push({
          context: `historico:${dep.sourceId}`,
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
ingestFiliacoesCamara()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_filiacoes_camara_done',
        durationMs: Date.now() - started,
        candidatos: stats.candidatos,
        fetched: stats.fetched,
        comFiliacao: stats.comFiliacao,
        periodosUpserted: stats.periodosUpserted,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(
      stats.errors.length > 0 && stats.periodosUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_filiacoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
