import { eq } from 'drizzle-orm'

import { mandatoExterno, parlamentar } from '@/shared/db/schema'
import { db } from '../shared/db'
import { fetchJson } from './camara-client'
import { mapMandatosExternos } from './mandatos-externos-mapper'
import { mandatosExternosResponseSchema } from './mandatos-externos-schema'

// Ingere mandatos externos (carreira pré-mandato) de todos os deputados federais.
// Fonte: GET /deputados/{id}/mandatosExternos — TSE-verificado, não autodeclarado.
// Câmara-only; Senado não expõe endpoint equivalente.
//
// Padrão: DELETE-by-parlamentar_id + INSERT em transação (princípio 5 CLAUDE.md).
// Mandatos externos são dados históricos estáticos — substituição total por
// deputado é idempotente e mais simples que ON CONFLICT com colunas nullable.

const PACING_MS = 300
const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface MandatosStats {
  deputadosProcessados: number
  deputadosSemMandatos: number
  mandatosUpserted: number
  errors: Array<{ context: string; reason: string }>
}

async function loadDeputados(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, 'CAMARA'))
}

async function processDeputado(
  dep: { id: string; sourceId: string },
  stats: MandatosStats,
): Promise<void> {
  const sourceUrl = `${BASE_URL}/deputados/${dep.sourceId}/mandatosExternos`
  let raw: unknown
  try {
    raw = await fetchJson(sourceUrl)
  } catch (err) {
    stats.errors.push({
      context: `dep:${dep.sourceId}:fetch`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const parsed = mandatosExternosResponseSchema.safeParse(raw)
  if (!parsed.success) {
    stats.errors.push({
      context: `dep:${dep.sourceId}:parse`,
      reason: parsed.error.issues[0]?.message ?? 'Invalid input',
    })
    return
  }

  const items = parsed.data.dados
  if (items.length === 0) {
    stats.deputadosSemMandatos++
    return
  }

  const rows = mapMandatosExternos(dep.id, items, sourceUrl)

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(mandatoExterno)
        .where(eq(mandatoExterno.parlamentarId, dep.id))
      await tx.insert(mandatoExterno).values(
        rows.map((r) => ({
          parlamentarId: r.parlamentarId,
          cargo: r.cargo,
          siglaUf: r.siglaUf,
          municipio: r.municipio,
          anoInicio: r.anoInicio,
          anoFim: r.anoFim,
          siglaPartidoEleicao: r.siglaPartidoEleicao,
          sourceUrl: r.sourceUrl,
        })),
      )
    })
    stats.mandatosUpserted += rows.length
    stats.deputadosProcessados++
  } catch (err) {
    stats.errors.push({
      context: `dep:${dep.sourceId}:db`,
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function ingestMandatosExternos(): Promise<MandatosStats> {
  const started = Date.now()
  const stats: MandatosStats = {
    deputadosProcessados: 0,
    deputadosSemMandatos: 0,
    mandatosUpserted: 0,
    errors: [],
  }

  const deputados = await loadDeputados()
  if (deputados.length === 0) {
    throw new Error(
      'Nenhum deputado no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }

  for (const dep of deputados) {
    await processDeputado(dep, stats)
    await sleep(PACING_MS)
  }

  const errorsSample = stats.errors.slice(0, 10)
  const errorsTruncated = Math.max(0, stats.errors.length - 10)

  console.log(
    JSON.stringify({
      event: 'ingest_mandatos_externos_done',
      durationMs: Date.now() - started,
      deputadosTotal: deputados.length,
      deputadosComMandatos: stats.deputadosProcessados,
      deputadosSemMandatos: stats.deputadosSemMandatos,
      mandatosUpserted: stats.mandatosUpserted,
      errorsCount: stats.errors.length,
      errorsSample,
      errorsTruncated,
    }),
  )

  if (stats.mandatosUpserted === 0 && stats.errors.length > 0) {
    process.exit(1)
  }

  return stats
}

ingestMandatosExternos().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'ingest_mandatos_externos_fatal',
      error: String(err),
    }),
  )
  process.exit(1)
})
