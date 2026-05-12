import { and, eq, sql } from 'drizzle-orm'

import { gasto, parlamentar } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { paginate } from './camara-client'
import { mapCamaraGasto } from './gastos-mapper'
import { camaraGastoSchema } from './gastos-schema'

const CASA = 'CAMARA' as const
const CONCURRENCY = 5
const ITENS_POR_PAGINA = 100

interface IngestionStats {
  deputadosProcessados: number
  gastosFetched: number
  gastosUpserted: number
  gastosSkipped: number
  errors: Array<{ context: string; reason: string }>
}

async function loadParlamentarLookup(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
}

async function processDeputado(
  dep: { id: string; sourceId: string },
  ano: number,
  stats: IngestionStats,
): Promise<void> {
  const rows: ReturnType<typeof mapCamaraGasto>[] = []

  try {
    for await (const raw of paginate(`/deputados/${dep.sourceId}/despesas`, {
      ano,
      itens: ITENS_POR_PAGINA,
    })) {
      stats.gastosFetched++
      const parsed = camaraGastoSchema.safeParse(raw)
      if (!parsed.success) {
        stats.gastosSkipped++
        stats.errors.push({
          context: `gasto:dep=${dep.sourceId}`,
          reason: parsed.error.issues.map((i) => i.message).join('; '),
        })
        continue
      }
      rows.push(mapCamaraGasto(parsed.data, dep.id, dep.sourceId))
    }
  } catch (err) {
    stats.errors.push({
      context: `dep=${dep.sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  // Idempotência por (parlamentar_id, ano_emissao): delete + bulk insert
  // numa transaction. Substitui o conjunto inteiro do ano para o deputado.
  await db.transaction(async (tx) => {
    await tx
      .delete(gasto)
      .where(
        and(
          eq(gasto.parlamentarId, dep.id),
          sql`extract(year from ${gasto.dataEmissao}) = ${ano}`,
        ),
      )

    if (rows.length > 0) {
      // Inserts em chunks para evitar payloads grandes demais.
      const CHUNK = 500
      for (let i = 0; i < rows.length; i += CHUNK) {
        await tx.insert(gasto).values(rows.slice(i, i + CHUNK))
      }
    }
  })

  stats.deputadosProcessados++
  stats.gastosUpserted += rows.length
}

export async function ingestGastosCamara(
  opts: { ano?: number } = {},
): Promise<IngestionStats> {
  const ano = opts.ano ?? new Date().getFullYear()

  const deputados = await loadParlamentarLookup()
  if (deputados.length === 0) {
    throw new Error(
      'Nenhum parlamentar CAMARA no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }

  const stats: IngestionStats = {
    deputadosProcessados: 0,
    gastosFetched: 0,
    gastosUpserted: 0,
    gastosSkipped: 0,
    errors: [],
  }

  await runWithConcurrency(
    deputados,
    async (dep) => {
      await processDeputado(dep, ano, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
const env = readIngestEnv()
const anoArg = env.ANO
ingestGastosCamara({ ano: anoArg })
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_gastos_camara_done',
        durationMs,
        ano: anoArg ?? new Date().getFullYear(),
        deputadosProcessados: stats.deputadosProcessados,
        gastosFetched: stats.gastosFetched,
        gastosUpserted: stats.gastosUpserted,
        gastosSkipped: stats.gastosSkipped,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.gastosUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_gastos_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
