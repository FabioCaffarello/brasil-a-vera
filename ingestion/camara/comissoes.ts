import { eq } from 'drizzle-orm'

import { membroComissao, parlamentar } from '@/shared/db/schema'
import { DATA_INICIO_JANELA_QUENTE } from '@/shared/legislatura'
import { db } from '../shared/db'
import { fetchJson, paginate } from './camara-client'
import {
  dedupePorChaveNatural,
  type MembroComissaoRow,
  mapMembroComissaoCamara,
} from './comissoes-mapper'
import {
  type CamaraOrgaoDetalhe,
  camaraDeputadoOrgaoSchema,
  camaraOrgaoDetalheSchema,
} from './comissoes-schema'

const CASA = 'CAMARA' as const
// Serial + pacing: os endpoints de detalhe da Câmara (/orgaos/{id}, igual ao
// /deputados/{id}) throttlam bursts — mesmo achado empírico do backfill-cpf.
// NÃO aumentar sem evidência.
const PACING_MS = 150
const PROGRESS_EVERY = 50
// Sem params de data, /deputados/{id}/orgaos só devolve vínculos ATIVOS agora —
// a tabela virava snapshot do presente (2.603/2.747 linhas com data_fim NULL) e
// perdia o histórico de comissões do mandato. Filtramos pela janela quente do
// ADR-016 (legislaturas 56+57, 2019+), mesmo recorte de proposicao/votacao, p/
// capturar os stints encerrados. O Senado já é histórico por natureza do
// endpoint (/senador/{id}/comissoes devolve a carreira inteira). Confirmado
// empiricamente: dataInicio sozinho basta e não vaza pré-2019.
const JANELA_INICIO = DATA_INICIO_JANELA_QUENTE.toISOString().slice(0, 10)
// Afordância de validação local: COMISSOES_LIMIT=N processa só os N primeiros
// deputados (amostra). Ausente em prod → processa todos.
const LIMIT = Number(process.env.COMISSOES_LIMIT) || undefined

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface IngestionStats {
  deputadosProcessados: number
  orgaosFetched: number
  comissoesUpserted: number
  naoComissaoSkipped: number
  rejected: number
  tiposMantidos: Record<string, number>
  errors: Array<{ context: string; reason: string }>
}

async function loadParlamentares(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
}

// Cache de detalhe de órgão deduplicado entre todos os deputados (~150 órgãos
// distintos vs. milhares de pares deputado×órgão). Guarda a Promise pra
// deduplicar também chamadas concorrentes/sequenciais ao mesmo id.
function makeOrgaoCache() {
  const cache = new Map<number, Promise<CamaraOrgaoDetalhe | null>>()

  async function fetchDetalhe(id: number): Promise<CamaraOrgaoDetalhe | null> {
    const raw = await fetchJson(`/orgaos/${id}`)
    const dados = (raw as { dados?: unknown })?.dados
    const parsed = camaraOrgaoDetalheSchema.safeParse(dados)
    if (!parsed.success) return null
    await sleep(PACING_MS)
    return parsed.data
  }

  return function getOrgaoDetalhe(
    id: number,
  ): Promise<CamaraOrgaoDetalhe | null> {
    const cached = cache.get(id)
    if (cached) return cached
    const promise = fetchDetalhe(id)
    cache.set(id, promise)
    return promise
  }
}

async function processDeputado(
  dep: { id: string; sourceId: string },
  getOrgaoDetalhe: (id: number) => Promise<CamaraOrgaoDetalhe | null>,
  stats: IngestionStats,
): Promise<void> {
  const rows: MembroComissaoRow[] = []

  try {
    for await (const raw of paginate(`/deputados/${dep.sourceId}/orgaos`, {
      itens: 100,
      dataInicio: JANELA_INICIO,
    })) {
      stats.orgaosFetched++
      const parsed = camaraDeputadoOrgaoSchema.safeParse(raw)
      if (!parsed.success) {
        stats.rejected++
        stats.errors.push({
          context: `orgao:dep=${dep.sourceId}`,
          reason: parsed.error.issues.map((i) => i.message).join('; '),
        })
        continue
      }

      const detalhe = await getOrgaoDetalhe(parsed.data.idOrgao)
      if (detalhe === null) {
        stats.rejected++
        stats.errors.push({
          context: `orgao-detalhe:dep=${dep.sourceId},orgao=${parsed.data.idOrgao}`,
          reason: 'detalhe /orgaos/{id} indisponível ou inválido',
        })
        continue
      }

      const row = mapMembroComissaoCamara(parsed.data, detalhe, dep.id)
      if (row === null) {
        stats.naoComissaoSkipped++
        continue
      }
      stats.tiposMantidos[detalhe.tipoOrgao ?? `cod:${detalhe.codTipoOrgao}`] =
        (stats.tiposMantidos[
          detalhe.tipoOrgao ?? `cod:${detalhe.codTipoOrgao}`
        ] ?? 0) + 1
      rows.push(row)
    }
  } catch (err) {
    stats.errors.push({
      context: `dep=${dep.sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const deduped = dedupePorChaveNatural(rows)

  // Idempotência por parlamentar (princípio 5, substituição em massa): apaga o
  // conjunto inteiro do deputado e reinsere. Captura saídas de comissão que um
  // ON CONFLICT DO UPDATE não removeria.
  await db.transaction(async (tx) => {
    await tx
      .delete(membroComissao)
      .where(eq(membroComissao.parlamentarId, dep.id))
    if (deduped.length > 0) {
      await tx.insert(membroComissao).values(deduped)
    }
  })

  stats.deputadosProcessados++
  stats.comissoesUpserted += deduped.length

  if (stats.deputadosProcessados % PROGRESS_EVERY === 0) {
    console.log(
      JSON.stringify({
        event: 'ingest_comissoes_camara_progress',
        deputadosProcessados: stats.deputadosProcessados,
        comissoesUpserted: stats.comissoesUpserted,
        naoComissaoSkipped: stats.naoComissaoSkipped,
        errosAteAgora: stats.errors.length,
      }),
    )
  }
  await sleep(PACING_MS)
}

export async function ingestComissoesCamara(): Promise<IngestionStats> {
  const todos = await loadParlamentares()
  if (todos.length === 0) {
    throw new Error(
      'Nenhum parlamentar CAMARA no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }
  const deputados = LIMIT ? todos.slice(0, LIMIT) : todos

  const stats: IngestionStats = {
    deputadosProcessados: 0,
    orgaosFetched: 0,
    comissoesUpserted: 0,
    naoComissaoSkipped: 0,
    rejected: 0,
    tiposMantidos: {},
    errors: [],
  }

  const getOrgaoDetalhe = makeOrgaoCache()

  // Serial (concorrência 1): detalhe da Câmara rejeita bursts (ver PACING_MS).
  for (const dep of deputados) {
    await processDeputado(dep, getOrgaoDetalhe, stats)
  }

  return stats
}

const started = Date.now()
ingestComissoesCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_comissoes_camara_done',
        durationMs,
        deputadosProcessados: stats.deputadosProcessados,
        orgaosFetched: stats.orgaosFetched,
        comissoesUpserted: stats.comissoesUpserted,
        naoComissaoSkipped: stats.naoComissaoSkipped,
        rejected: stats.rejected,
        tiposMantidos: stats.tiposMantidos,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    // Política unificada: só falha se houve erros E zero sucessos.
    process.exit(
      stats.errors.length > 0 && stats.comissoesUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_comissoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
