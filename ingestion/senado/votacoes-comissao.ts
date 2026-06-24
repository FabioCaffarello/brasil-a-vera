import { eq, sql } from 'drizzle-orm'

import {
  parlamentar,
  votacaoComissaoSenado,
  votoNominalComissaoSenado,
} from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { warnIfAtLimit } from '../shared/warnings'
import { fetchSenadoJson } from './senado-client'
import { type SenadoVotacao, senadoVotacaoSchema } from './votacoes-schema'
import { mapTipoVotoSenado, type TipoVoto } from './votos-mapper'

// Votações nominais em comissões do Senado (ADR-057).
// Reutiliza o endpoint /votacao (mesmo que senado-votacoes), mas filtra
// apenas registros onde siglaColegiado != 'SF' (plenário).
//
// Validação empírica obrigatória (princípio 13): o campo votacoesPlenario
// no log final mostra quantas foram descartadas. Copiar no PR antes do merge.

const CONCURRENCY = 5
const DEFAULT_DAYS_BACK = 30
const LIMIT = 1000

interface IngestionStats {
  votacoesFetched: number
  votacoesPlenario: number
  votacoesComissao: number
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
    .where(eq(parlamentar.casa, 'SENADO'))
  const map = new Map<string, string>()
  for (const r of rows) map.set(r.sourceId, r.id)
  return map
}

async function processVotacaoComissao(
  v: SenadoVotacao,
  comissaoSigla: string,
  parlamentarLookup: Map<string, string>,
  stats: IngestionStats,
): Promise<void> {
  const sourceId = String(v.codigoSessaoVotacao)

  const votos: Array<{
    parlamentarId: string | null
    senadorSourceId: string
    voto: TipoVoto
    partidoSiglaVoto: string | null
    ufVoto: string | null
  }> = []
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
    const senadorSourceId = String(rawVoto.codigoParlamentar)
    // parlamentar_id nullable: senadores fora do lookup (mandatos anteriores,
    // suplências) ficam com NULL — senador_source_id sempre gravado.
    const parlamentarId = parlamentarLookup.get(senadorSourceId) ?? null
    if (!parlamentarId) stats.votosSkipped++

    votos.push({
      parlamentarId,
      senadorSourceId,
      voto: tipoVoto,
      partidoSiglaVoto: rawVoto.siglaPartidoParlamentar ?? null,
      ufVoto: rawVoto.siglaUFParlamentar ?? null,
    })
    if (tipoVoto === 'SIM') votosSim++
    else if (tipoVoto === 'NAO') votosNao++
    else if (tipoVoto === 'ABSTENCAO') abstencoes++
  }

  // data_sessao como YYYY-MM-DD: a API entrega datetime completo ou só data.
  const dataSessao = v.dataSessao.slice(0, 10)

  await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(votacaoComissaoSenado)
      .values({
        sourceId,
        comissaoSigla,
        dataSessao,
        descricao: v.descricaoVotacao,
        resultado: v.resultadoVotacao ?? null,
        materiaSourceId:
          v.codigoMateria != null ? String(v.codigoMateria) : null,
        votosSim,
        votosNao,
        abstencoes,
        trustLevel: 'L1',
        sourceUrl: `https://legis.senado.leg.br/dadosabertos/votacao?codigoSessaoVotacao=${sourceId}`,
      })
      .onConflictDoUpdate({
        target: [votacaoComissaoSenado.sourceId],
        set: {
          comissaoSigla,
          dataSessao,
          descricao: v.descricaoVotacao,
          resultado: v.resultadoVotacao ?? null,
          materiaSourceId:
            v.codigoMateria != null ? String(v.codigoMateria) : null,
          votosSim,
          votosNao,
          abstencoes,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: votacaoComissaoSenado.id })

    const votacaoId = upserted[0].id
    await tx
      .delete(votoNominalComissaoSenado)
      .where(eq(votoNominalComissaoSenado.votacaoId, votacaoId))
    if (votos.length > 0) {
      await tx.insert(votoNominalComissaoSenado).values(
        votos.map((vt) => ({
          votacaoId,
          parlamentarId: vt.parlamentarId,
          senadorSourceId: vt.senadorSourceId,
          voto: vt.voto,
          partidoSiglaVoto: vt.partidoSiglaVoto,
          ufVoto: vt.ufVoto,
        })),
      )
    }
  })

  stats.votacoesUpserted++
  stats.votosUpserted += votos.length
}

export async function ingestVotacoesComissaoSenado(
  opts: { dataInicio?: string; dataFim?: string } = {},
): Promise<IngestionStats> {
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
    votacoesPlenario: 0,
    votacoesComissao: 0,
    votacoesUpserted: 0,
    votacoesSkippedError: 0,
    votosUpserted: 0,
    votosSkipped: 0,
    errors: [],
  }

  const path = `/votacao?datainicio=${range.dataInicio}&datafim=${range.dataFim}&limit=${LIMIT}`
  const raw = await fetchSenadoJson<unknown>(path)
  if (!Array.isArray(raw)) {
    throw new Error('Esperado array no top-level de /votacao')
  }

  stats.votacoesFetched = raw.length
  await warnIfAtLimit({
    label: 'senado_votacao_comissao',
    count: raw.length,
    limit: LIMIT,
  })

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

  // Grafias de plenário conhecidas na API do Senado:
  // "SF" = Senado Federal (sessão formal); "PLEN" = plenário em formato abreviado.
  // Conservador: sigla ausente/nula descarta — melhor falso negativo que gravar
  // voto plenário como se fosse de comissão.
  const SIGLAS_PLENARIO = new Set(['SF', 'PLEN'])

  const comissao: Array<{ v: SenadoVotacao; sigla: string }> = []
  for (const v of parsed) {
    const sigla = v.informeLegislativo?.siglaColegiado
    if (!sigla || SIGLAS_PLENARIO.has(sigla)) {
      stats.votacoesPlenario++
    } else {
      stats.votacoesComissao++
      comissao.push({ v, sigla })
    }
  }

  await runWithConcurrency(
    comissao,
    async ({ v, sigla }) => {
      await processVotacaoComissao(v, sigla, parlamentarLookup, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
const env = readIngestEnv()
ingestVotacoesComissaoSenado({
  dataInicio: env.DATA_INICIO,
  dataFim: env.DATA_FIM,
})
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_votacoes_comissao_senado_done',
        durationMs,
        votacoesFetched: stats.votacoesFetched,
        votacoesPlenario: stats.votacoesPlenario,
        votacoesComissao: stats.votacoesComissao,
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
        event: 'ingest_votacoes_comissao_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
