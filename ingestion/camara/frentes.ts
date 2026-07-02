import { eq, sql } from 'drizzle-orm'

import {
  frenteMembro,
  frenteParlamentar,
  parlamentar,
} from '@/shared/db/schema'
import { db } from '../shared/db'
import { fetchJson, paginate } from './camara-client'
import { mapFrenteCamara, mapFrenteMembroCamara } from './frentes-mapper'
import { camaraFrenteMembroSchema, camaraFrenteSchema } from './frentes-schema'

// Ingere frentes parlamentares da Câmara — cabeçalho + membros.
// Fonte: GET /frentes (lista paginada) → GET /frentes/{id}/membros por frente.
//
// Dois upserts sequenciais por frente:
//   1. frente_parlamentar: ON CONFLICT source_id DO UPDATE nome/ingested_at
//   2. frente_membro: DELETE por frente_id + INSERT (captura saídas de membros)
//
// Senado não publica endpoint equivalente estruturado (ADR-056).

const PACING_MS = 200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface FrentesStats {
  frentesFetched: number
  frentesUpserted: number
  membrosFetched: number
  membrosUpserted: number
  foraBaseParlamentar: number
  errors: Array<{ context: string; reason: string }>
}

async function loadDeputadoPorSourceId(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, 'CAMARA'))
  if (rows.length === 0) {
    throw new Error(
      'Nenhum parlamentar CAMARA no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }
  return new Map(rows.map((r) => [r.sourceId, r.id]))
}

async function processFrente(
  frenteSourceId: string,
  frenteDbId: string,
  parlamentarPorSourceId: Map<string, string>,
  stats: FrentesStats,
): Promise<void> {
  let membros: unknown[]
  try {
    const raw = await fetchJson(`/frentes/${frenteSourceId}/membros`)
    const dados = (raw as { dados?: unknown })?.dados
    if (!Array.isArray(dados)) {
      stats.errors.push({
        context: `frente:${frenteSourceId}:membros`,
        reason: 'response.dados não é array',
      })
      return
    }
    membros = dados
  } catch (err) {
    stats.errors.push({
      context: `frente:${frenteSourceId}:membros`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const rows = []
  for (const rawMembro of membros) {
    stats.membrosFetched++
    const parsed = camaraFrenteMembroSchema.safeParse(rawMembro)
    if (!parsed.success) {
      stats.errors.push({
        context: `frente:${frenteSourceId}:membro`,
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }
    const row = mapFrenteMembroCamara(
      parsed.data,
      frenteSourceId,
      parlamentarPorSourceId,
    )
    if (row === null) {
      stats.foraBaseParlamentar++
      continue
    }
    rows.push({
      frenteId: frenteDbId,
      parlamentarId: row.parlamentarId,
      titulo: row.titulo,
    })
  }

  // API can return the same parlamentar multiple times per frente with different
  // títulos — deduplicate by (frenteId, parlamentarId) to avoid UNIQUE violation.
  const seenKeys = new Set<string>()
  const dedupedRows = rows.filter((r) => {
    const key = `${r.frenteId}:${r.parlamentarId}`
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  // Substituição atômica de membros: apaga o conjunto atual e reinsere.
  await db.transaction(async (tx) => {
    await tx.delete(frenteMembro).where(eq(frenteMembro.frenteId, frenteDbId))
    if (dedupedRows.length > 0) {
      await tx.insert(frenteMembro).values(dedupedRows)
    }
  })

  stats.membrosUpserted += rows.length
}

export async function ingestFrentesCamara(): Promise<FrentesStats> {
  const parlamentarPorSourceId = await loadDeputadoPorSourceId()

  const stats: FrentesStats = {
    frentesFetched: 0,
    frentesUpserted: 0,
    membrosFetched: 0,
    membrosUpserted: 0,
    foraBaseParlamentar: 0,
    errors: [],
  }

  for await (const rawFrente of paginate('/frentes', { itens: 100 })) {
    const parsed = camaraFrenteSchema.safeParse(rawFrente)
    if (!parsed.success) {
      stats.errors.push({
        context: 'frentes:list',
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }
    stats.frentesFetched++

    const frenteRow = mapFrenteCamara(parsed.data)

    // Upsert do cabeçalho. Retorna o id para vincular os membros.
    const [upserted] = await db
      .insert(frenteParlamentar)
      .values(frenteRow)
      .onConflictDoUpdate({
        target: frenteParlamentar.sourceId,
        set: {
          nome: frenteRow.nome,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: frenteParlamentar.id })

    if (!upserted) {
      stats.errors.push({
        context: `frente:${frenteRow.sourceId}:upsert`,
        reason: 'upsert não retornou id',
      })
      continue
    }

    stats.frentesUpserted++

    await processFrente(
      frenteRow.sourceId,
      upserted.id,
      parlamentarPorSourceId,
      stats,
    )

    await sleep(PACING_MS)
  }

  return stats
}

const started = Date.now()
ingestFrentesCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    console.log(
      JSON.stringify({
        event: 'ingest_frentes_camara_done',
        durationMs,
        frentesFetched: stats.frentesFetched,
        frentesUpserted: stats.frentesUpserted,
        membrosFetched: stats.membrosFetched,
        membrosUpserted: stats.membrosUpserted,
        foraBaseParlamentar: stats.foraBaseParlamentar,
        errorsCount: stats.errors.length,
        errorsSample: stats.errors.slice(0, 10),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.frentesUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_frentes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
