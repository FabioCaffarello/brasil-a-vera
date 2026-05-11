import { eq, sql } from 'drizzle-orm'

import { parlamentar, votacao, votoNominal } from '@/shared/db/schema'
import { db } from '../shared/db'
import { fetchSenadoJson } from './senado-client'
import { type SenadoVotacao, senadoVotacaoSchema } from './votacoes-schema'
import { mapTipoVotoSenado, type TipoVoto } from './votos-mapper'

const CASA = 'SENADO' as const
const CONCURRENCY = 5
const DEFAULT_DAYS_BACK = 30

interface IngestionStats {
  votacoesFetched: number
  votacoesUpserted: number
  votacoesSkippedError: number
  votosUpserted: number
  votosSkipped: number
  errors: Array<{ context: string; reason: string }>
}

function defaultDateRange(): { dataInicio: string; dataFim: string } {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - DEFAULT_DAYS_BACK)
  const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '')
  return { dataInicio: fmt(inicio), dataFim: fmt(hoje) }
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

async function processVotacao(
  v: SenadoVotacao,
  parlamentarLookup: Map<string, string>,
  stats: IngestionStats,
): Promise<void> {
  const sourceId = String(v.codigoSessaoVotacao)

  // Conta totais a partir dos votos individuais — mais consistente que os
  // campos `totalVotosSim/Nao/Abstencao` que frequentemente vêm null.
  const votos: Array<{ parlamentarId: string; voto: TipoVoto }> = []
  let votosSim = 0
  let votosNao = 0
  let abstencoes = 0

  for (const rawVoto of v.votos ?? []) {
    const tipoVoto = mapTipoVotoSenado(rawVoto.siglaVotoParlamentar)
    if (!tipoVoto) {
      stats.votosSkipped++
      stats.errors.push({
        context: `votos:${sourceId}`,
        reason: `sigla desconhecida: ${rawVoto.siglaVotoParlamentar}`,
      })
      continue
    }
    const parlamentarId = parlamentarLookup.get(
      String(rawVoto.codigoParlamentar),
    )
    if (!parlamentarId) {
      // Senador fora do lookup — provavelmente mandato anterior à legislatura
      // atual ou suplência não ingerida. Conta mas não falha.
      stats.votosSkipped++
      continue
    }
    votos.push({ parlamentarId, voto: tipoVoto })
    if (tipoVoto === 'SIM') votosSim++
    else if (tipoVoto === 'NAO') votosNao++
    else if (tipoVoto === 'ABSTENCAO') abstencoes++
  }

  const aprovada = v.resultadoVotacao === 'A'
  const orgao =
    v.informeLegislativo?.siglaColegiado ??
    v.informeLegislativo?.nomeColegiado ??
    'SF'

  await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(votacao)
      .values({
        sourceId,
        casa: CASA,
        proposicaoId: null,
        dataHora: new Date(v.dataSessao),
        descricao: v.descricaoVotacao,
        orgao,
        votosSim,
        votosNao,
        abstencoes,
        ausentes: null,
        aprovada,
        trustLevel: 'L1',
        sourceUrl: `https://legis.senado.leg.br/dadosabertos/votacao?codigoSessaoVotacao=${sourceId}`,
      })
      .onConflictDoUpdate({
        target: [votacao.casa, votacao.sourceId],
        set: {
          descricao: v.descricaoVotacao,
          orgao,
          votosSim,
          votosNao,
          abstencoes,
          aprovada,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: votacao.id })

    const votacaoId = upserted[0].id
    await tx.delete(votoNominal).where(eq(votoNominal.votacaoId, votacaoId))
    if (votos.length > 0) {
      await tx.insert(votoNominal).values(
        votos.map((vt) => ({
          votacaoId,
          parlamentarId: vt.parlamentarId,
          voto: vt.voto,
          trustLevel: 'L1' as const,
        })),
      )
    }
  })

  stats.votacoesUpserted++
  stats.votosUpserted += votos.length
}

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  const workers = new Set<Promise<unknown>>()
  for (const item of items) {
    const promise = fn(item).finally(() => workers.delete(promise))
    workers.add(promise)
    if (workers.size >= concurrency) {
      await Promise.race(workers)
    }
  }
  await Promise.all(workers)
}

export async function ingestVotacoesSenado(
  opts: { dataInicio?: string; dataFim?: string } = {},
): Promise<IngestionStats> {
  const range =
    opts.dataInicio && opts.dataFim
      ? { dataInicio: opts.dataInicio, dataFim: opts.dataFim }
      : defaultDateRange()

  const parlamentarLookup = await loadParlamentarLookup()
  if (parlamentarLookup.size === 0) {
    throw new Error(
      'Nenhum parlamentar SENADO no banco — rode `npm run ingest:senado:senadores` primeiro',
    )
  }

  const stats: IngestionStats = {
    votacoesFetched: 0,
    votacoesUpserted: 0,
    votacoesSkippedError: 0,
    votosUpserted: 0,
    votosSkipped: 0,
    errors: [],
  }

  // Endpoint /votacao não pagina; usa limite alto para cobrir até ~1 ano.
  // Volume típico: ~3-10 votações/dia em sessão.
  const path = `/votacao?datainicio=${range.dataInicio}&datafim=${range.dataFim}&limit=1000`
  const raw = await fetchSenadoJson<unknown>(path)
  if (!Array.isArray(raw)) {
    throw new Error('Esperado array no top-level de /votacao')
  }

  const parsed = raw
    .map((item) => senadoVotacaoSchema.safeParse(item))
    .map((p, i) => {
      if (!p.success) {
        stats.votacoesSkippedError++
        stats.errors.push({
          context: `votacao[${i}]`,
          reason: p.error.issues.map((iss) => iss.message).join('; '),
        })
        return null
      }
      return p.data
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  stats.votacoesFetched = raw.length

  await runWithConcurrency(
    parsed,
    async (v) => {
      await processVotacao(v, parlamentarLookup, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
ingestVotacoesSenado({
  dataInicio: process.env.DATA_INICIO,
  dataFim: process.env.DATA_FIM,
})
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_votacoes_senado_done',
        durationMs,
        votacoesFetched: stats.votacoesFetched,
        votacoesUpserted: stats.votacoesUpserted,
        votacoesSkippedError: stats.votacoesSkippedError,
        votosUpserted: stats.votosUpserted,
        votosSkipped: stats.votosSkipped,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(
      stats.errors.length > 0 && stats.votacoesUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_votacoes_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
