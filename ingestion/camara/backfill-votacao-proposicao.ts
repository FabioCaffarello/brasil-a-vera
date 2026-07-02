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
// NULL e próximo cron tenta.
//
// **Concorrência (Sprint 34, issue #567)**: sem flag, concorrência=1
// (serial — comportamento histórico, seguro no cron). Para backfill
// histórico bulk use `--concurrency=N` (máx 20) ou env
// `BACKFILL_CONCURRENCY`. O loop bifasico paralleliza os fetchDetalhe
// (HTTP puro) e serializa as operações de DB+auto-fetch (safeguard
// invariante). N=5–10 reduz tempo de 28k votações de horas para minutos.

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

function parseConcurrency(): number {
  const raw =
    process.argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ??
    process.env.BACKFILL_CONCURRENCY
  if (!raw) return 1
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1)
    throw new Error(`--concurrency inválido: "${raw}". Esperado inteiro ≥ 1.`)
  if (n > 20)
    throw new Error(
      `--concurrency ${n} excede o máximo de 20 (proteção contra rate-limit da API da Câmara).`,
    )
  return n
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

// Processa o resultado de fetchDetalhe: resolve FK no lookup local e,
// se necessário, auto-faz a proposição. Sempre serial (garante invariante
// do contador do safeguard).
async function processResult(
  row: { id: string; sourceId: string },
  detalhe: Awaited<ReturnType<typeof fetchDetalhe>>,
  proposicaoLookup: Map<string, string>,
  parlamentarLookup: Map<string, string>,
  stats: BackfillStats,
): Promise<void> {
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

  const concurrency = parseConcurrency()

  if (concurrency === 1) {
    // Loop serial — comportamento histórico. Auto-fetch reverso muta o
    // lookup compartilhado e incrementa o contador do safeguard; sem
    // await concorrente, o contador é atualizado antes do próximo item.
    for (const row of elegiveis) {
      let detalhe: Awaited<ReturnType<typeof fetchDetalhe>>
      try {
        detalhe = await fetchDetalhe(row.sourceId)
      } catch (err) {
        if (err instanceof HttpFetchError && err.status === 404) {
          stats.naoEncontradas404++
        } else {
          stats.errors.push({
            context: `detalhe:${row.sourceId}`,
            reason: err instanceof Error ? err.message : String(err),
          })
        }
        continue
      }
      await processResult(
        row,
        detalhe,
        proposicaoLookup,
        parlamentarLookup,
        stats,
      )
    }
  } else {
    // Loop bifásico para backfill bulk histórico (--concurrency=N).
    // Fase 1 (paralela): N fetchDetalhe simultâneos → puro HTTP, sem
    //   mutação de estado.
    // Fase 2 (serial): processa os resultados do lote em ordem →
    //   safeguard e lookup permanecem single-writer.
    // Cada 10 lotes emite progresso em stderr para acompanhar a execução.
    const BATCH = concurrency
    const totalBatches = Math.ceil(elegiveis.length / BATCH)

    for (let b = 0; b < totalBatches; b++) {
      const batch = elegiveis.slice(b * BATCH, (b + 1) * BATCH)

      type FetchOk = {
        ok: true
        row: (typeof batch)[0]
        detalhe: Awaited<ReturnType<typeof fetchDetalhe>>
      }
      type FetchErr = { ok: false; row: (typeof batch)[0]; err: unknown }

      const fetched: Array<FetchOk | FetchErr> = await Promise.all(
        batch.map(async (row): Promise<FetchOk | FetchErr> => {
          try {
            return { ok: true, row, detalhe: await fetchDetalhe(row.sourceId) }
          } catch (err) {
            return { ok: false, row, err }
          }
        }),
      )

      for (const r of fetched) {
        if (!r.ok) {
          const err = r.err
          if (err instanceof HttpFetchError && err.status === 404) {
            stats.naoEncontradas404++
          } else {
            stats.errors.push({
              context: `detalhe:${r.row.sourceId}`,
              reason: err instanceof Error ? err.message : String(err),
            })
          }
          continue
        }
        await processResult(
          r.row,
          r.detalhe,
          proposicaoLookup,
          parlamentarLookup,
          stats,
        )
      }

      if ((b + 1) % 10 === 0 || b + 1 === totalBatches) {
        process.stderr.write(
          `${JSON.stringify({
            event: 'backfill_progress',
            batch: b + 1,
            totalBatches,
            processed: Math.min((b + 1) * BATCH, elegiveis.length),
            total: elegiveis.length,
            matched: stats.matched,
            errors: stats.errors.length,
          })}\n`,
        )
      }
    }
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
