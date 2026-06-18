import { eq } from 'drizzle-orm'

import { orientacao, votacao } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { db } from '../shared/db'
import { fetchWithRetry } from '../shared/http'
import { classificarOrientacao, mapOrientacaoVoto } from './orientacoes-mapper'
import { camaraOrientacaoSchema } from './orientacoes-schema'

const CASA = 'CAMARA' as const
const CONCURRENCY = 5
const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

interface IngestionStats {
  votacoesProcessadas: number
  orientacoesUpserted: number
  votacoesSemOrientacao: number
  orientacoesBlocoRetidas: number
  orientacoesSkippedBloco: number
  orientacoesSkippedVazia: number
  orientacoesSkippedDesconhecida: number
  errors: Array<{ context: string; reason: string }>
}

async function loadVotacoesCamara(
  maxVotacoes?: number,
): Promise<Array<{ id: string; sourceId: string }>> {
  const query = db
    .select({ id: votacao.id, sourceId: votacao.sourceId })
    .from(votacao)
    .where(eq(votacao.casa, CASA))
  // Suporte a teste local: MAX_VOTACOES=N reduz o escopo do select pra
  // validar o pipeline com poucos exemplos antes do cron full run.
  return maxVotacoes ? query.limit(maxVotacoes) : query
}

async function fetchOrientacoes(votacaoSourceId: string): Promise<unknown[]> {
  const response = await fetchWithRetry(
    `${BASE_URL}/votacoes/${votacaoSourceId}/orientacoes`,
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

async function processVotacao(
  prop: { id: string; sourceId: string },
  stats: IngestionStats,
): Promise<void> {
  let rawList: unknown[]
  try {
    rawList = await fetchOrientacoes(prop.sourceId)
  } catch (err) {
    stats.errors.push({
      context: `fetch:${prop.sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  if (rawList.length === 0) {
    stats.votacoesSemOrientacao++
    stats.votacoesProcessadas++
    return
  }

  // Dedupe por partido_sigla: se a API mandar duas linhas pro mesmo
  // partido (raro), a última vence. PK composta (votacao_id, partido_sigla)
  // não toleraria duplicatas no INSERT.
  const mappedByPartido = new Map<
    string,
    {
      partidoSigla: string
      orientacao: 'SIM' | 'NAO' | 'LIBERADO' | 'OBSTRUCAO'
      tipoLideranca: 'P' | 'B'
    }
  >()

  for (const raw of rawList) {
    const parsed = camaraOrientacaoSchema.safeParse(raw)
    if (!parsed.success) {
      stats.errors.push({
        context: `parse:${prop.sourceId}`,
        reason: parsed.error.issues.map((i) => i.message).join('; '),
      })
      continue
    }
    const o = parsed.data

    // ADR-040: retém orientação de partido ('P') e de bloco institucional
    // ('B': Governo/Oposição/Maioria/Minoria). Federações e blocos ad-hoc
    // ('Fdr .../Bl ...') e 'P' sem código de partido retornam null e são
    // descartados.
    const classificada = classificarOrientacao(o)
    if (classificada === null) {
      stats.orientacoesSkippedBloco++
      continue
    }

    const orientacaoNormalizada = mapOrientacaoVoto(o.orientacaoVoto)
    if (orientacaoNormalizada === null) {
      // null pode vir de string vazia (~60% das linhas partidárias) ou de
      // valor desconhecido. Distingue pra log: vazia é esperada, desconhecida
      // pode indicar evolução da API.
      const trimmed = (o.orientacaoVoto ?? '').trim()
      if (trimmed === '') {
        stats.orientacoesSkippedVazia++
      } else {
        stats.orientacoesSkippedDesconhecida++
        stats.errors.push({
          context: `orientacao:${prop.sourceId}:${o.siglaPartidoBloco}`,
          reason: `orientacaoVoto desconhecida: "${trimmed}"`,
        })
      }
      continue
    }

    mappedByPartido.set(classificada.partidoSigla, {
      partidoSigla: classificada.partidoSigla,
      orientacao: orientacaoNormalizada,
      tipoLideranca: classificada.tipoLideranca,
    })
  }

  const orientacoesFinais = Array.from(mappedByPartido.values())
  if (orientacoesFinais.length === 0) {
    stats.votacoesSemOrientacao++
    stats.votacoesProcessadas++
    return
  }

  // Substituição completa por votação: DELETE + bulk INSERT na mesma
  // transação. Coerente com padrão de votoNominal (mesmo módulo) e
  // CLAUDE.md princípio 5.
  await db.transaction(async (tx) => {
    await tx.delete(orientacao).where(eq(orientacao.votacaoId, prop.id))
    await tx.insert(orientacao).values(
      orientacoesFinais.map((o) => ({
        votacaoId: prop.id,
        partidoSigla: o.partidoSigla,
        orientacao: o.orientacao,
        // 'B' explícito para blocos — nunca herda o default 'P' da coluna.
        tipoLideranca: o.tipoLideranca,
      })),
    )
  })

  stats.orientacoesUpserted += orientacoesFinais.length
  stats.orientacoesBlocoRetidas += orientacoesFinais.filter(
    (o) => o.tipoLideranca === 'B',
  ).length
  stats.votacoesProcessadas++
}

function parseMaxVotacoes(): number | undefined {
  const raw = process.env.MAX_VOTACOES
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.floor(n)
}

export async function ingestOrientacoesCamara(
  opts: { maxVotacoes?: number } = {},
): Promise<IngestionStats> {
  const votacoes = await loadVotacoesCamara(opts.maxVotacoes)
  if (votacoes.length === 0) {
    throw new Error(
      'Nenhuma votação CAMARA no banco — rode `npm run ingest:camara:votacoes` primeiro',
    )
  }

  const stats: IngestionStats = {
    votacoesProcessadas: 0,
    orientacoesUpserted: 0,
    votacoesSemOrientacao: 0,
    orientacoesBlocoRetidas: 0,
    orientacoesSkippedBloco: 0,
    orientacoesSkippedVazia: 0,
    orientacoesSkippedDesconhecida: 0,
    errors: [],
  }

  await runWithConcurrency(
    votacoes,
    async (v) => {
      await processVotacao(v, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
const maxVotacoes = parseMaxVotacoes()
ingestOrientacoesCamara({ maxVotacoes })
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_orientacoes_camara_done',
        durationMs,
        maxVotacoes: maxVotacoes ?? null,
        votacoesProcessadas: stats.votacoesProcessadas,
        orientacoesUpserted: stats.orientacoesUpserted,
        orientacoesBlocoRetidas: stats.orientacoesBlocoRetidas,
        votacoesSemOrientacao: stats.votacoesSemOrientacao,
        orientacoesSkippedBloco: stats.orientacoesSkippedBloco,
        orientacoesSkippedVazia: stats.orientacoesSkippedVazia,
        orientacoesSkippedDesconhecida: stats.orientacoesSkippedDesconhecida,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(
      stats.errors.length > 0 && stats.orientacoesUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_orientacoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
