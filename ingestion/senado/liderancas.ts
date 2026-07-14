import { and, eq } from 'drizzle-orm'

import { liderancaCargo, parlamentar } from '@/shared/db/schema'
import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import { dedupeLiderancas } from '../camara/liderancas-mapper'
import { db } from '../shared/db'
import { mapLiderancasSenado } from './liderancas-mapper'
import { senadoLiderancasSchema } from './liderancas-schema'
import { fetchSenadoJson } from './senado-client'

// Ingere líderes do Senado Federal na legislatura atual.
// Fonte: GET /composicao/lideranca — endpoint único, sem paginação.
// Cobre partidos + posições institucionais (Governo, Oposição, Minoria, Maioria).
// Idempotente: DELETE-by-key + INSERT dentro de transação (princípio 5).

const CASA = 'SENADO' as const

interface LiderancasStats {
  lideresEncontrados: number
  lideresUpserted: number
  foraBaseParlamentar: number
  duplicatasColapsadas: number
  errors: Array<{ context: string; reason: string }>
}

async function loadSenadorPorSourceId(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
  if (rows.length === 0) {
    throw new Error(
      'Nenhum parlamentar SENADO no banco — rode `npm run ingest:senado:senadores` primeiro',
    )
  }
  return new Map(rows.map((r) => [r.sourceId, r.id]))
}

export async function ingestLiderancasSenado(): Promise<LiderancasStats> {
  const parlamentarPorSourceId = await loadSenadorPorSourceId()

  const stats: LiderancasStats = {
    lideresEncontrados: 0,
    lideresUpserted: 0,
    foraBaseParlamentar: 0,
    duplicatasColapsadas: 0,
    errors: [],
  }

  const raw = await fetchSenadoJson<unknown>('/composicao/lideranca')
  const parsed = senadoLiderancasSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: 'composicao/lideranca',
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return stats
  }

  const rows = mapLiderancasSenado(
    parsed.data,
    LEGISLATURA_ATUAL,
    parlamentarPorSourceId,
  )

  const sfItems = parsed.data.filter((item) => item.casa === 'SF')
  stats.lideresEncontrados = sfItems.length
  stats.foraBaseParlamentar = stats.lideresEncontrados - rows.length

  // Fonte repete o mesmo cargo com dataDesignacao distintas (redesignações,
  // issue #727) — sem dedupe o INSERT viola lideranca_cargo_natural_key.
  const rowsUnicos = dedupeLiderancas(rows)
  stats.duplicatasColapsadas = rows.length - rowsUnicos.length

  await db.transaction(async (tx) => {
    await tx
      .delete(liderancaCargo)
      .where(
        and(
          eq(liderancaCargo.casa, CASA),
          eq(liderancaCargo.legislatura, LEGISLATURA_ATUAL),
        ),
      )
    if (rowsUnicos.length > 0) {
      await tx.insert(liderancaCargo).values(rowsUnicos)
    }
  })

  stats.lideresUpserted = rowsUnicos.length
  return stats
}

const started = Date.now()
ingestLiderancasSenado()
  .then((stats) => {
    const durationMs = Date.now() - started
    console.log(
      JSON.stringify({
        event: 'ingest_liderancas_senado_done',
        durationMs,
        lideresEncontrados: stats.lideresEncontrados,
        lideresUpserted: stats.lideresUpserted,
        foraBaseParlamentar: stats.foraBaseParlamentar,
        duplicatasColapsadas: stats.duplicatasColapsadas,
        errorsCount: stats.errors.length,
        errorsSample: stats.errors.slice(0, 10),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.lideresUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_liderancas_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
