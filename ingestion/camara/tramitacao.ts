import { sql } from 'drizzle-orm'

import { proposicao, tramitacao } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { fetchWithRetry } from '../shared/http'
import { mapTramitacaoCamara } from './tramitacao-mapper'
import { camaraTramitacaoSchema } from './tramitacao-schema'

const CONCURRENCY = 5
const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

// Filtro de casa via padrão na sourceUrl. proposicao não tem coluna `casa`
// porque a chave natural (tipo, numero, ano) é globalmente única — uma PL
// 1234/2024 é a mesma proposição independente de origem. Identificamos
// "esta linha foi ingerida pela API da Câmara" pelo prefixo da sourceUrl
// (`dadosabertos.camara.leg.br` vs `www25.senado.leg.br`). Limitação
// conhecida: proposições compartilhadas entre Câmara e Senado (PL → revisão
// no Senado) têm sourceUrl/sourceId do último ingestor; coverage de
// tramitação flip-flopa entre as duas casas conforme cadência. Follow-up
// natural: separar source_id por casa em proposicao (issue separada).
const CAMARA_URL_PATTERN = '%camara.leg.br%'

interface IngestionStats {
  proposicoesProcessadas: number
  eventosUpserted: number
  proposicoesSemTramitacao: number
  eventosSkippedError: number
  errors: Array<{ context: string; reason: string }>
}

async function loadProposicoesCamara(): Promise<
  Array<{ id: string; sourceId: string }>
> {
  return db
    .select({ id: proposicao.id, sourceId: proposicao.sourceId })
    .from(proposicao)
    .where(sql`${proposicao.sourceUrl} LIKE ${CAMARA_URL_PATTERN}`)
}

async function fetchTramitacoes(
  proposicaoSourceId: string,
): Promise<unknown[]> {
  const response = await fetchWithRetry(
    `${BASE_URL}/proposicoes/${proposicaoSourceId}/tramitacoes`,
    {
      headers: {
        accept: 'application/json',
        'user-agent':
          'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)',
      },
    },
  )
  const json = (await response.json()) as { dados?: unknown[] }
  return json.dados ?? []
}

async function processProposicao(
  prop: { id: string; sourceId: string },
  stats: IngestionStats,
): Promise<void> {
  let rawList: unknown[]
  try {
    rawList = await fetchTramitacoes(prop.sourceId)
  } catch (err) {
    stats.eventosSkippedError++
    stats.errors.push({
      context: `fetch:${prop.sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  if (rawList.length === 0) {
    stats.proposicoesSemTramitacao++
    stats.proposicoesProcessadas++
    return
  }

  // Parse + map; eventos individuais que falharem Zod são contabilizados
  // como skipped mas não bloqueiam os demais da mesma proposição.
  const mappedById = new Map<string, ReturnType<typeof mapTramitacaoCamara>>()
  for (const raw of rawList) {
    const parsed = camaraTramitacaoSchema.safeParse(raw)
    if (!parsed.success) {
      stats.eventosSkippedError++
      stats.errors.push({
        context: `parse:${prop.sourceId}`,
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }
    const m = mapTramitacaoCamara(parsed.data)
    // Deduplica por source_id dentro da mesma proposição (raro mas defensivo).
    mappedById.set(m.sourceId, m)
  }

  const unique = Array.from(mappedById.values())
  if (unique.length === 0) {
    stats.proposicoesProcessadas++
    return
  }

  // Bulk upsert via ON CONFLICT (proposicao_id, source_id). EXCLUDED na
  // cláusula SET aplica per-row os valores recém-enviados, atualizando só
  // o que mudou desde o último fetch.
  await db
    .insert(tramitacao)
    .values(
      unique.map((m) => ({
        proposicaoId: prop.id,
        data: m.data,
        orgao: m.orgao,
        descricaoResumida: m.descricaoResumida,
        descricaoCompleta: m.descricaoCompleta,
        situacaoResultante: m.situacaoResultante,
        sourceId: m.sourceId,
      })),
    )
    .onConflictDoUpdate({
      target: [tramitacao.proposicaoId, tramitacao.sourceId],
      set: {
        data: sql`excluded.data`,
        orgao: sql`excluded.orgao`,
        descricaoResumida: sql`excluded.descricao_resumida`,
        descricaoCompleta: sql`excluded.descricao_completa`,
        situacaoResultante: sql`excluded.situacao_resultante`,
      },
    })

  stats.eventosUpserted += unique.length
  stats.proposicoesProcessadas++
}

export async function ingestTramitacaoCamara(): Promise<IngestionStats> {
  const proposicoes = await loadProposicoesCamara()
  if (proposicoes.length === 0) {
    throw new Error(
      'Nenhuma proposição CAMARA no banco — rode `npm run ingest:camara:proposicoes` primeiro',
    )
  }

  const stats: IngestionStats = {
    proposicoesProcessadas: 0,
    eventosUpserted: 0,
    proposicoesSemTramitacao: 0,
    eventosSkippedError: 0,
    errors: [],
  }

  await runWithConcurrency(
    proposicoes,
    async (p) => {
      await processProposicao(p, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestTramitacaoCamara()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_tramitacao_camara_done',
        durationMs,
        proposicoesProcessadas: stats.proposicoesProcessadas,
        eventosUpserted: stats.eventosUpserted,
        proposicoesSemTramitacao: stats.proposicoesSemTramitacao,
        eventosSkippedError: stats.eventosSkippedError,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.eventosUpserted === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_tramitacao_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
