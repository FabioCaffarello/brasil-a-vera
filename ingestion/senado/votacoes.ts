import { eq, sql } from 'drizzle-orm'

import { parlamentar, votacao, votoNominal } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
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
          dataHora: new Date(v.dataSessao),
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
        })),
      )
    }
  })

  stats.votacoesUpserted++
  stats.votosUpserted += votos.length
}

export async function ingestVotacoesSenado(
  opts: { dataInicio?: string; dataFim?: string } = {},
): Promise<IngestionStats> {
  // API do Senado /votacao espera datas no formato YYYYMMDD (sem hífens).
  // Se vier YYYY-MM-DD do env, normaliza pra compacto.
  const range =
    opts.dataInicio && opts.dataFim
      ? {
          dataInicio: opts.dataInicio.replace(/-/g, ''),
          dataFim: opts.dataFim.replace(/-/g, ''),
        }
      : defaultDateRange(DEFAULT_DAYS_BACK, true)

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
const env = readIngestEnv()
ingestVotacoesSenado({
  dataInicio: env.DATA_INICIO,
  dataFim: env.DATA_FIM,
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
