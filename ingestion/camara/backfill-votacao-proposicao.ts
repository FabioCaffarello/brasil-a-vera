import { and, eq, isNull, sql } from 'drizzle-orm'

import { parlamentar, proposicao, votacao } from '@/shared/db/schema'
import { db } from '../shared/db'
import { fetchWithRetry, HttpFetchError } from '../shared/http'
import { ingestProposicaoBySourceId } from './proposicoes-core'
import { camaraVotacaoDetalheSchema } from './votacao-detalhe-schema'

// Backfill `votacao.proposicao_id` para votações da Câmara que entraram no
// banco com FK NULL (ingestão inicial não buscava o detalhe). Usa
// `proposicoesAfetadas[0].id` do endpoint `/votacoes/{id}` para resolver
// a referência, e cruza com `proposicoes.proposicao.source_id`.
//
// Idempotente: só toca em votações onde `proposicao_id IS NULL`.
//
// **Auto-fetch reverso (Sprint 3.0.5 Bloco 3)**: quando a proposição
// referenciada NÃO está no banco, dispara `ingestProposicaoBySourceId`
// inline. Diagnóstico empírico mostrou que 100% das 20 votações nominais
// Câmara sem `proposicao_id` caem nessa categoria — backfill funciona,
// mas as proposições alvo estão fora da janela default de
// `ingest:camara:proposicoes` (30 dias). Safeguard de 50 proposições
// novas por execução previne explosão acidental; quando atinge, deixa
// NULL e próximo cron tenta. Loop é SERIAL quando o safeguard está
// próximo para respeitar o limite (vs concurrent antes).

const CASA = 'CAMARA' as const
const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'
const AUTO_FETCH_SAFEGUARD = 50

interface BackfillStats {
  votacoesElegiveis: number
  matched: number
  naoEncontradas: number
  naoEncontradas404: number
  proposicoesAutoFetched: number
  proposicoesAutoFetchedSafeguardHit: number
  // Stats do ingest core delegado quando faz auto-fetch.
  temasUpserted: number
  autoresUpserted: number
  autoresSemMatch: number
  proposicoesSkippedTipo: number
  proposicoesSkippedError: number
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

async function loadParlamentarLookup(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: parlamentar.id, sourceId: parlamentar.sourceId })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
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
  parlamentarLookup: Map<string, string>,
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

  const refSourceId = String(afetada.id)
  let proposicaoId = proposicaoLookup.get(refSourceId)

  if (!proposicaoId) {
    // Proposição não ingerida — auto-fetch reverso (Sprint 3.0.5 Bloco 3).
    // Safeguard: máximo 50 auto-fetches por execução para prevenir explosão
    // acidental de storage caso surja onda de votações referenciando
    // proposições antigas (legislaturas anteriores).
    if (stats.proposicoesAutoFetched >= AUTO_FETCH_SAFEGUARD) {
      stats.proposicoesAutoFetchedSafeguardHit++
      stats.naoEncontradas++
      return
    }
    const inserted = await ingestProposicaoBySourceId(
      refSourceId,
      parlamentarLookup,
      stats,
    )
    if (!inserted) {
      // Tipo fora de escopo, erro de fetch, etc — já contado nos stats
      // delegados. Deixa NULL e segue.
      stats.naoEncontradas++
      return
    }
    proposicaoId = inserted
    proposicaoLookup.set(refSourceId, inserted)
    stats.proposicoesAutoFetched++
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
  const parlamentarLookup = await loadParlamentarLookup()
  // parlamentarLookup pode estar vazio em DB recém-criado, mas isso não
  // bloqueia o backfill — autores sem match contam em `autoresSemMatch`.

  // Ordem: votações nominais primeiro (têm voto_nominal), mais recentes
  // antes. Garante que o safeguard de auto-fetch consuma o orçamento em
  // votações user-facing (pares contraditórios, alinhamento) antes de
  // procedimentais. Sem ORDER BY o select era não-determinístico e
  // consumia o safeguard em simbólicas (validado empiricamente — Sprint
  // 3.0.5: 3 runs resolveram só 8 das 20 nominais com ordem aleatória).
  const elegiveis = await db
    .select({ id: votacao.id, sourceId: votacao.sourceId })
    .from(votacao)
    .where(and(eq(votacao.casa, CASA), isNull(votacao.proposicaoId)))
    .orderBy(
      sql`EXISTS (SELECT 1 FROM votacoes.voto_nominal vn WHERE vn.votacao_id = ${votacao.id}) DESC`,
      sql`${votacao.dataHora} DESC`,
    )

  const stats: BackfillStats = {
    votacoesElegiveis: elegiveis.length,
    matched: 0,
    naoEncontradas: 0,
    naoEncontradas404: 0,
    proposicoesAutoFetched: 0,
    proposicoesAutoFetchedSafeguardHit: 0,
    temasUpserted: 0,
    autoresUpserted: 0,
    autoresSemMatch: 0,
    proposicoesSkippedTipo: 0,
    proposicoesSkippedError: 0,
    errors: [],
  }

  // Loop SERIAL — auto-fetch reverso muta o lookup compartilhado e
  // incrementa o contador do safeguard. Concorrência criaria race
  // condition no contador. Volume é pequeno (dezenas de votações por
  // execução pós-3.0.5; backfill 4×/dia), serial é aceitável.
  for (const row of elegiveis) {
    await processVotacao(row, proposicaoLookup, parlamentarLookup, stats)
  }

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
        proposicoesAutoFetched: stats.proposicoesAutoFetched,
        proposicoesAutoFetchedSafeguardHit:
          stats.proposicoesAutoFetchedSafeguardHit,
        autoFetchTemasUpserted: stats.temasUpserted,
        autoFetchAutoresUpserted: stats.autoresUpserted,
        autoFetchAutoresSemMatch: stats.autoresSemMatch,
        autoFetchSkippedTipo: stats.proposicoesSkippedTipo,
        autoFetchSkippedError: stats.proposicoesSkippedError,
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
