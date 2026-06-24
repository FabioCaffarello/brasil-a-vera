import { and, eq, inArray } from 'drizzle-orm'

import { liderancaCargo, parlamentar } from '@/shared/db/schema'
import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import { db } from '../shared/db'
import { fetchJson } from './camara-client'
import type { LiderancaCargoRow } from './liderancas-mapper'
import { MESA_TIPOS, mapMesaItemCamara } from './mesa-diretora-mapper'
import { camaraMesaItemSchema } from './mesa-diretora-schema'

// Ingere a Mesa Diretora da Câmara para a legislatura atual.
// Fonte: GET /legislaturas/{id}/mesa — endpoint único, sem paginação (~9 membros).
// Idempotente: DELETE por tipo (PRESIDENTE_MESA…) + INSERT em transação (princípio 5).
//
// Roda em monthly tier 1 (APÓS camara-liderancas tier 0, que limpa toda a tabela
// CAMARA+leg57 antes de reinserir líderes de partido). O DELETE por tipo aqui
// garante idempotência em runs isolados sem depender do tier anterior.

const CASA = 'CAMARA' as const

interface MesaStats {
  membrosFetched: number
  membrosUpserted: number
  foraBaseParlamentar: number
  errors: Array<{ context: string; reason: string }>
}

async function loadDeputadoPorSourceId(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
  if (rows.length === 0) {
    throw new Error(
      'Nenhum parlamentar CAMARA no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }
  return new Map(rows.map((r) => [r.sourceId, r.id]))
}

export async function ingestMesaDiretoraCamara(): Promise<MesaStats> {
  const parlamentarPorSourceId = await loadDeputadoPorSourceId()

  const stats: MesaStats = {
    membrosFetched: 0,
    membrosUpserted: 0,
    foraBaseParlamentar: 0,
    errors: [],
  }

  let raw: unknown
  try {
    raw = await fetchJson(`/legislaturas/${LEGISLATURA_ATUAL}/mesa`)
  } catch (err) {
    stats.errors.push({
      context: `legislaturas/${LEGISLATURA_ATUAL}/mesa`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return stats
  }

  const dados = (raw as { dados?: unknown })?.dados
  if (!Array.isArray(dados)) {
    stats.errors.push({
      context: `legislaturas/${LEGISLATURA_ATUAL}/mesa`,
      reason: 'response.dados não é array',
    })
    return stats
  }

  const rows: LiderancaCargoRow[] = []
  for (const rawItem of dados) {
    stats.membrosFetched++
    const parsed = camaraMesaItemSchema.safeParse(rawItem)
    if (!parsed.success) {
      stats.errors.push({
        context: 'mesa:item',
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }
    const row = mapMesaItemCamara(
      parsed.data,
      LEGISLATURA_ATUAL,
      parlamentarPorSourceId,
    )
    if (row === null) {
      stats.foraBaseParlamentar++
      continue
    }
    rows.push(row)
  }

  // Apaga só os tipos de Mesa (não interfere com líderes de partido inseridos
  // pelo tier anterior) e reinsere o conjunto atual da legislatura.
  await db.transaction(async (tx) => {
    await tx
      .delete(liderancaCargo)
      .where(
        and(
          eq(liderancaCargo.casa, CASA),
          inArray(liderancaCargo.tipo, [...MESA_TIPOS]),
        ),
      )
    if (rows.length > 0) {
      await tx.insert(liderancaCargo).values(rows)
    }
  })

  stats.membrosUpserted = rows.length
  return stats
}

const started = Date.now()
ingestMesaDiretoraCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    console.log(
      JSON.stringify({
        event: 'ingest_mesa_diretora_camara_done',
        durationMs,
        membrosFetched: stats.membrosFetched,
        membrosUpserted: stats.membrosUpserted,
        foraBaseParlamentar: stats.foraBaseParlamentar,
        errorsCount: stats.errors.length,
        errorsSample: stats.errors.slice(0, 10),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.membrosUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_mesa_diretora_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
