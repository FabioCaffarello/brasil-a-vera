import { eq, sql } from 'drizzle-orm'

import { proposicao, proposicaoAutor, proposicaoTema } from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { warnIfAtLimit } from '../shared/warnings'
import {
  mapSiglaSenado,
  mapSituacaoFromTramitando,
  parseIdentificacao,
} from './proposicoes-mapper'
import { type SenadoProcesso, senadoProcessoSchema } from './proposicoes-schema'
import { fetchSenadoJson } from './senado-client'

const CONCURRENCY = 5
const DEFAULT_DAYS_BACK = 30
const LIMIT = 2000

interface IngestionStats {
  proposicoesFetched: number
  proposicoesUpserted: number
  proposicoesSkippedTipo: number
  proposicoesSkippedError: number
  autoresUpserted: number
  errors: Array<{ context: string; reason: string }>
}

async function processProcesso(
  p: SenadoProcesso,
  stats: IngestionStats,
): Promise<void> {
  const ref = parseIdentificacao(p.identificacao)
  if (!ref) {
    stats.proposicoesSkippedError++
    stats.errors.push({
      context: `identificacao:${p.id}`,
      reason: `formato inesperado: "${p.identificacao}"`,
    })
    return
  }

  const tipo = mapSiglaSenado(ref.sigla)
  if (!tipo) {
    // Tipos fora do enum interno (REQ, OF, MSF, ...): skip silencioso.
    stats.proposicoesSkippedTipo++
    return
  }

  const sourceId = String(p.codigoMateria)
  const situacao = mapSituacaoFromTramitando(p.tramitando)
  const sourceUrl = `https://www25.senado.leg.br/web/atividade/materias/-/materia/${p.codigoMateria}`

  await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(proposicao)
      .values({
        sourceId,
        tipo,
        numero: ref.numero,
        ano: ref.ano,
        ementa: p.ementa,
        ementaDetalhada: null,
        situacao,
        regime: null,
        trustLevel: 'L1',
        sourceUrl,
      })
      .onConflictDoUpdate({
        target: [proposicao.tipo, proposicao.numero, proposicao.ano],
        set: {
          sourceId,
          ementa: p.ementa,
          situacao,
          sourceUrl,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: proposicao.id })

    const proposicaoId = upserted[0].id

    // Substitui autor: delete + insert único. O endpoint /processo entrega
    // `autoria` como string única (não array detalhado como na Câmara).
    // parlamentar_id fica NULL — match por nome viria em PR de enriquecimento.
    await tx
      .delete(proposicaoAutor)
      .where(eq(proposicaoAutor.proposicaoId, proposicaoId))

    if (p.autoria && p.autoria.trim().length > 0) {
      await tx.insert(proposicaoAutor).values({
        proposicaoId,
        parlamentarId: null,
        nome: p.autoria,
        tipoAutoria: 'AUTOR',
      })
      stats.autoresUpserted++
    }

    // Sem temas: /processo não entrega classificação temática. Limpa caso
    // venha de uma ingestão anterior que tenha tido temas (defensivo).
    await tx
      .delete(proposicaoTema)
      .where(eq(proposicaoTema.proposicaoId, proposicaoId))
  })

  stats.proposicoesUpserted++
}

export async function ingestProposicoesSenado(
  opts: { dataInicio?: string } = {},
): Promise<IngestionStats> {
  // Senado /processo aceita `dataAtualizacaoInicio` no formato YYYYMMDD
  // (sem hífens). Se vier `YYYY-MM-DD` no env, normaliza pra compacto.
  const fromEnv = opts.dataInicio?.replace(/-/g, '')
  const dataInicio =
    fromEnv ?? defaultDateRange(DEFAULT_DAYS_BACK, true).dataInicio

  const stats: IngestionStats = {
    proposicoesFetched: 0,
    proposicoesUpserted: 0,
    proposicoesSkippedTipo: 0,
    proposicoesSkippedError: 0,
    autoresUpserted: 0,
    errors: [],
  }

  // O endpoint /processo aceita filtros incluindo `dataAtualizacaoInicio`.
  // Não há paginação documentada — uso limit alto.
  const path = `/processo?dataAtualizacaoInicio=${dataInicio}&limit=${LIMIT}`
  const raw = await fetchSenadoJson<unknown>(path)
  if (!Array.isArray(raw)) {
    throw new Error('Esperado array no top-level de /processo')
  }

  stats.proposicoesFetched = raw.length
  await warnIfAtLimit({
    label: 'senado_processo',
    count: raw.length,
    limit: LIMIT,
  })

  const parsed = raw
    .map((item, i) => {
      const r = senadoProcessoSchema.safeParse(item)
      if (!r.success) {
        stats.proposicoesSkippedError++
        stats.errors.push({
          context: `processo[${i}]`,
          reason: r.error.issues.map((iss) => iss.message).join('; '),
        })
        return null
      }
      return r.data
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  await runWithConcurrency(
    parsed,
    async (p) => {
      await processProcesso(p, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
const env = readIngestEnv()
ingestProposicoesSenado({ dataInicio: env.DATA_INICIO })
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_proposicoes_senado_done',
        durationMs,
        proposicoesFetched: stats.proposicoesFetched,
        proposicoesUpserted: stats.proposicoesUpserted,
        proposicoesSkippedTipo: stats.proposicoesSkippedTipo,
        proposicoesSkippedError: stats.proposicoesSkippedError,
        autoresUpserted: stats.autoresUpserted,
        errorsCount: stats.errors.length,
        errorsSample,
        ...(errorsExtra > 0 ? { errorsTruncated: errorsExtra } : {}),
      }),
    )
    process.exit(
      stats.errors.length > 0 && stats.proposicoesUpserted === 0 ? 1 : 0,
    )
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: 'ingest_proposicoes_senado_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
