import { eq } from 'drizzle-orm'

import { parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { persistFiliacoes } from '../shared/filiacao'
import { mapFiliacoesSenado } from './filiacoes-mapper'
import {
  extractFiliacoes,
  senadoFiliacoesRespostaSchema,
} from './filiacoes-schema'
import { fetchSenadoJson } from './senado-client'

// Popula `filiacao_partidaria` para os senadores (#502). O Senado entrega
// períodos prontos em `/senador/{codigo}/filiacoes` — mapeamento direto.
// Idempotente: substitui em massa as filiações de cada senador.

const CASA = 'SENADO' as const
const CONCURRENCY = 3

interface IngestionStats {
  candidatos: number
  fetched: number
  comFiliacao: number
  periodosUpserted: number
  errors: Array<{ context: string; reason: string }>
}

export async function ingestFiliacoesSenado(): Promise<IngestionStats> {
  const senadores = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))

  const stats: IngestionStats = {
    candidatos: senadores.length,
    fetched: 0,
    comFiliacao: 0,
    periodosUpserted: 0,
    errors: [],
  }

  await runWithConcurrency(
    senadores,
    async (sen) => {
      try {
        const raw = await fetchSenadoJson<unknown>(
          `/senador/${sen.sourceId}/filiacoes`,
        )
        stats.fetched++
        const parsed = senadoFiliacoesRespostaSchema.safeParse(raw)
        if (!parsed.success) {
          stats.errors.push({
            context: `filiacoes:${sen.sourceId}`,
            reason: parsed.error.issues.map((i) => i.message).join('; '),
          })
          return
        }
        const periodos = mapFiliacoesSenado(extractFiliacoes(parsed.data))
        await persistFiliacoes(sen.id, periodos)
        if (periodos.length > 0) stats.comFiliacao++
        stats.periodosUpserted += periodos.length
      } catch (err) {
        stats.errors.push({
          context: `filiacoes:${sen.sourceId}`,
          reason: err instanceof Error ? err.message : String(err),
        })
      }
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestFiliacoesSenado()
  .then((stats) => {
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_filiacoes_senado_done',
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
        event: 'ingest_filiacoes_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
