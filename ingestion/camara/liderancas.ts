import { and, eq } from 'drizzle-orm'

import { liderancaCargo, parlamentar } from '@/shared/db/schema'
import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import { db } from '../shared/db'
import { fetchJson, paginate } from './camara-client'
import { type LiderancaCargoRow, mapLiderCamara } from './liderancas-mapper'
import { camaraLiderSchema, camaraPartidoSchema } from './liderancas-schema'

// Ingere líderes e vice-líderes de partidos da Câmara na legislatura atual.
// Fonte: GET /partidos?legislatura=N → GET /partidos/{id}/lideres por partido.
// Idempotente: DELETE-by-key + INSERT dentro de transação (princípio 5).
//
// Dados quase-estáticos (ADR-056): ingestão mensal. Pareia com a ingestão do
// Senado (senado/liderancas.ts) que cobre lideranças institucionais (Governo,
// Oposição) — a Câmara expõe isso via /orgaos (escopo futuro).

const CASA = 'CAMARA' as const
const PACING_MS = 200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface LiderancasStats {
  partidosFetched: number
  lideresFetched: number
  lideresUpserted: number
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

export async function ingestLiderancasCamara(): Promise<LiderancasStats> {
  const parlamentarPorSourceId = await loadDeputadoPorSourceId()

  const stats: LiderancasStats = {
    partidosFetched: 0,
    lideresFetched: 0,
    lideresUpserted: 0,
    foraBaseParlamentar: 0,
    errors: [],
  }

  const rows: LiderancaCargoRow[] = []

  for await (const rawPartido of paginate('/partidos', {
    itens: 100,
  })) {
    const parsedPartido = camaraPartidoSchema.safeParse(rawPartido)
    if (!parsedPartido.success) {
      stats.errors.push({
        context: 'partido:list',
        reason: parsedPartido.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }
    stats.partidosFetched++
    const partido = parsedPartido.data

    let lideres: unknown[]
    try {
      const raw = await fetchJson(`/partidos/${partido.id}/lideres`)
      const dados = (raw as { dados?: unknown })?.dados
      if (!Array.isArray(dados)) {
        stats.errors.push({
          context: `partido:${partido.id}:lideres`,
          reason: 'response.dados não é array',
        })
        await sleep(PACING_MS)
        continue
      }
      lideres = dados
    } catch (err) {
      stats.errors.push({
        context: `partido:${partido.id}:lideres`,
        reason: err instanceof Error ? err.message : String(err),
      })
      await sleep(PACING_MS)
      continue
    }

    for (const rawLider of lideres) {
      stats.lideresFetched++
      const parsed = camaraLiderSchema.safeParse(rawLider)
      if (!parsed.success) {
        stats.errors.push({
          context: `partido:${partido.id}:lider`,
          reason: parsed.error.issues.map((i) => i.message).join('; '),
        })
        continue
      }
      const row = mapLiderCamara(
        parsed.data,
        partido.sigla,
        LEGISLATURA_ATUAL,
        parlamentarPorSourceId,
      )
      if (row === null) {
        stats.foraBaseParlamentar++
        continue
      }
      rows.push(row)
    }

    await sleep(PACING_MS)
  }

  // Substituição atômica: apaga lideranças CAMARA da legislatura atual e
  // reinsere o conjunto completo (princípio 5). Captura saídas de liderança
  // que um ON CONFLICT DO UPDATE não removeria.
  await db.transaction(async (tx) => {
    await tx
      .delete(liderancaCargo)
      .where(
        and(
          eq(liderancaCargo.casa, CASA),
          eq(liderancaCargo.legislatura, LEGISLATURA_ATUAL),
        ),
      )
    if (rows.length > 0) {
      await tx.insert(liderancaCargo).values(rows)
    }
  })

  stats.lideresUpserted = rows.length
  return stats
}

const started = Date.now()
ingestLiderancasCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_liderancas_camara_done',
        durationMs,
        partidosFetched: stats.partidosFetched,
        lideresFetched: stats.lideresFetched,
        lideresUpserted: stats.lideresUpserted,
        foraBaseParlamentar: stats.foraBaseParlamentar,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.lideresUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_liderancas_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
