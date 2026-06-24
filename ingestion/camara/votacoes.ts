import { eq, sql } from 'drizzle-orm'

import { parlamentar, votacao, votoNominal } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { paginate } from './camara-client'
import { camaraVotacaoListagemSchema } from './votacoes-schema'
import { mapTipoVoto, type TipoVoto } from './votos-mapper'
import { camaraVotoNominalSchema } from './votos-schema'

const CASA = 'CAMARA' as const
const CONCURRENCY = 5
const DEFAULT_DAYS_BACK = 30
const ITENS_POR_PAGINA = 100

interface IngestionStats {
  votacoesFetched: number
  votacoesUpserted: number
  votacoesSkipped: number
  votosUpserted: number
  votosSkipped: number
  errors: Array<{ context: string; reason: string }>
}

// Pré-carrega o mapeamento {source_id da Câmara → UUID interno} de todos os
// deputados já ingeridos. Inserts de voto_nominal exigem o UUID interno como
// FK — fazer SELECT por voto seria proibitivamente caro.
async function loadParlamentarLookup(): Promise<Map<string, string>> {
  const rows = await db
    .select({
      id: parlamentar.id,
      sourceId: parlamentar.sourceId,
    })
    .from(parlamentar)
    .where(eq(parlamentar.casa, CASA))
  const map = new Map<string, string>()
  for (const r of rows) map.set(r.sourceId, r.id)
  return map
}

async function fetchVotosNominais(
  votacaoSourceId: string,
  parlamentarLookup: Map<string, string>,
  stats: IngestionStats,
): Promise<{
  votos: Array<{
    parlamentarId: string
    voto: TipoVoto
    partidoSiglaVoto: string | null
    ufVoto: string | null
  }>
  totais: { votosSim: number; votosNao: number; abstencoes: number }
}> {
  const votos: Array<{
    parlamentarId: string
    voto: TipoVoto
    partidoSiglaVoto: string | null
    ufVoto: string | null
  }> = []
  let votosSim = 0
  let votosNao = 0
  let abstencoes = 0

  for await (const raw of paginate(`/votacoes/${votacaoSourceId}/votos`)) {
    const parsed = camaraVotoNominalSchema.safeParse(raw)
    if (!parsed.success) {
      stats.votosSkipped++
      stats.errors.push({
        context: `votos:${votacaoSourceId}`,
        reason: `payload inválido: ${parsed.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      })
      continue
    }
    const tipoVoto = mapTipoVoto(parsed.data.tipoVoto)
    if (!tipoVoto) {
      stats.votosSkipped++
      stats.errors.push({
        context: `votos:${votacaoSourceId}`,
        reason: `tipoVoto desconhecido: ${parsed.data.tipoVoto}`,
      })
      continue
    }
    const sourceId = String(parsed.data.deputado_.id)
    const parlamentarId = parlamentarLookup.get(sourceId)
    if (!parlamentarId) {
      // Deputado ausente do lookup — pode ser suplência não ingerida, mandato
      // anterior à legislatura atual, etc. Conta mas não falha a votação.
      stats.votosSkipped++
      continue
    }
    votos.push({
      parlamentarId,
      voto: tipoVoto,
      partidoSiglaVoto: parsed.data.deputado_.siglaPartido ?? null,
      ufVoto: parsed.data.deputado_.siglaUf ?? null,
    })
    if (tipoVoto === 'SIM') votosSim++
    else if (tipoVoto === 'NAO') votosNao++
    else if (tipoVoto === 'ABSTENCAO') abstencoes++
  }

  return { votos, totais: { votosSim, votosNao, abstencoes } }
}

async function processVotacao(
  raw: unknown,
  parlamentarLookup: Map<string, string>,
  stats: IngestionStats,
): Promise<void> {
  const parsed = camaraVotacaoListagemSchema.safeParse(raw)
  if (!parsed.success) {
    stats.votacoesSkipped++
    stats.errors.push({
      context: 'votacao_listagem',
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }
  const v = parsed.data

  let votosResult: Awaited<ReturnType<typeof fetchVotosNominais>>
  try {
    votosResult = await fetchVotosNominais(v.id, parlamentarLookup, stats)
  } catch (err) {
    stats.votacoesSkipped++
    stats.errors.push({
      context: `votos:${v.id}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const { votos, totais } = votosResult

  await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(votacao)
      .values({
        sourceId: v.id,
        casa: CASA,
        proposicaoId: null, // proposicoes ainda não foram ingeridas
        dataHora: new Date(v.dataHoraRegistro),
        descricao: v.descricao,
        orgao: v.siglaOrgao,
        votosSim: totais.votosSim,
        votosNao: totais.votosNao,
        abstencoes: totais.abstencoes,
        ausentes: null,
        aprovada: v.aprovacao,
        trustLevel: 'L1',
        sourceUrl: v.uri,
      })
      .onConflictDoUpdate({
        target: [votacao.casa, votacao.sourceId],
        set: {
          dataHora: new Date(v.dataHoraRegistro),
          descricao: v.descricao,
          orgao: v.siglaOrgao,
          votosSim: totais.votosSim,
          votosNao: totais.votosNao,
          abstencoes: totais.abstencoes,
          aprovada: v.aprovacao,
          sourceUrl: v.uri,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: votacao.id })

    const votacaoId = upserted[0].id

    // Reinsere a lista completa de votos. Estratégia mais simples e idempotente
    // que upsert por voto: delete + bulk insert dentro da mesma transaction.
    await tx.delete(votoNominal).where(eq(votoNominal.votacaoId, votacaoId))

    if (votos.length > 0) {
      await tx.insert(votoNominal).values(
        votos.map((vt) => ({
          votacaoId,
          parlamentarId: vt.parlamentarId,
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

export async function ingestVotacoesCamara(
  opts: { dataInicio?: string; dataFim?: string } = {},
): Promise<IngestionStats> {
  const range =
    opts.dataInicio && opts.dataFim
      ? { dataInicio: opts.dataInicio, dataFim: opts.dataFim }
      : defaultDateRange(DEFAULT_DAYS_BACK)

  const parlamentarLookup = await loadParlamentarLookup()
  if (parlamentarLookup.size === 0) {
    throw new Error(
      'Nenhum parlamentar CAMARA no banco — rode `npm run ingest:camara:deputados` primeiro',
    )
  }

  const stats: IngestionStats = {
    votacoesFetched: 0,
    votacoesUpserted: 0,
    votacoesSkipped: 0,
    votosUpserted: 0,
    votosSkipped: 0,
    errors: [],
  }

  const items = paginate('/votacoes', {
    dataInicio: range.dataInicio,
    dataFim: range.dataFim,
    itens: ITENS_POR_PAGINA,
  })

  await runWithConcurrency(
    items,
    async (raw) => {
      stats.votacoesFetched++
      await processVotacao(raw, parlamentarLookup, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
const env = readIngestEnv()
ingestVotacoesCamara({
  dataInicio: env.DATA_INICIO,
  dataFim: env.DATA_FIM,
})
  .then((stats) => {
    const durationMs = Date.now() - started
    // Limita errors no log final para não inundar (mantém os 10 primeiros).
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_votacoes_camara_done',
        durationMs,
        votacoesFetched: stats.votacoesFetched,
        votacoesUpserted: stats.votacoesUpserted,
        votacoesSkipped: stats.votacoesSkipped,
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
        event: 'ingest_votacoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
