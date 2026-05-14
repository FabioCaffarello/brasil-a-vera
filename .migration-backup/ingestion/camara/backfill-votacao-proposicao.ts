import { and, eq, isNull, sql } from 'drizzle-orm'

import { proposicao, votacao } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { fetchWithRetry, HttpFetchError } from '../shared/http'
import { camaraVotacaoDetalheSchema } from './votacao-detalhe-schema'

// Backfill `votacao.proposicao_id` para votações da Câmara que entraram no
// banco com FK NULL (ingestão inicial não buscava o detalhe). Usa
// `proposicoesAfetadas[0].id` do endpoint `/votacoes/{id}` para resolver
// a referência, e cruza com `proposicoes.proposicao.source_id`.
//
// Idempotente: só toca em votações onde `proposicao_id IS NULL` e a
// proposição já está ingerida. Em votações cuja proposição correspondente
// ainda não foi capturada por `ingest:camara:proposicoes`, deixa NULL e
// conta como `naoEncontradas` (sem erro).

const CASA = 'CAMARA' as const
const CONCURRENCY = 5
const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

interface BackfillStats {
  votacoesElegiveis: number
  matched: number
  naoEncontradas: number
  naoEncontradas404: number
  errors: Array<{ context: string; reason: string }>
}

async function loadProposicaoLookup(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: proposicao.id, sourceId: proposicao.sourceId })
    .from(proposicao)
  const map = new Map<string, string>()
  for (const r of rows) map.set(r.sourceId, r.id)
  return map
}

async function fetchDetalhe(votacaoSourceId: string) {
  const response = await fetchWithRetry(
    `${BASE_URL}/votacoes/${votacaoSourceId}`,
    {
      headers: {
        accept: 'application/json',
        'user-agent':
          'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)',
      },
    },
  )
  const json = (await response.json()) as { dados: unknown }
  return camaraVotacaoDetalheSchema.parse(json.dados)
}

async function processVotacao(
  row: { id: string; sourceId: string },
  proposicaoLookup: Map<string, string>,
  stats: BackfillStats,
): Promise<void> {
  let detalhe: Awaited<ReturnType<typeof fetchDetalhe>>
  try {
    detalhe = await fetchDetalhe(row.sourceId)
  } catch (err) {
    if (err instanceof HttpFetchError && err.status === 404) {
      stats.naoEncontradas404++
      return
    }
    stats.errors.push({
      context: `detalhe:${row.sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const afetada = detalhe.proposicoesAfetadas?.[0]
  if (!afetada) {
    stats.naoEncontradas++
    return
  }

  const proposicaoId = proposicaoLookup.get(String(afetada.id))
  if (!proposicaoId) {
    // Proposição ainda não ingerida — comum, dado o escopo restrito de
    // datas em `ingest:camara:proposicoes`.
    stats.naoEncontradas++
    return
  }

  await db
    .update(votacao)
    .set({ proposicaoId, ingestedAt: sql`now()` })
    .where(eq(votacao.id, row.id))

  stats.matched++
}

export async function backfillVotacaoProposicao(): Promise<BackfillStats> {
  const proposicaoLookup = await loadProposicaoLookup()
  if (proposicaoLookup.size === 0) {
    throw new Error(
      'Nenhuma proposição no banco — rode `npm run ingest:camara:proposicoes` primeiro',
    )
  }

  const elegiveis = await db
    .select({ id: votacao.id, sourceId: votacao.sourceId })
    .from(votacao)
    .where(and(eq(votacao.casa, CASA), isNull(votacao.proposicaoId)))

  const stats: BackfillStats = {
    votacoesElegiveis: elegiveis.length,
    matched: 0,
    naoEncontradas: 0,
    naoEncontradas404: 0,
    errors: [],
  }

  await runWithConcurrency(
    elegiveis,
    async (row) => {
      await processVotacao(row, proposicaoLookup, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
backfillVotacaoProposicao()
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'backfill_votacao_proposicao_done',
        durationMs,
        votacoesElegiveis: stats.votacoesElegiveis,
        matched: stats.matched,
        naoEncontradas: stats.naoEncontradas,
        naoEncontradas404: stats.naoEncontradas404,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(stats.errors.length > 0 && stats.matched === 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'backfill_votacao_proposicao_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
