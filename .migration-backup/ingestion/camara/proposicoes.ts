import { eq, sql } from 'drizzle-orm'

import {
  parlamentar,
  proposicao,
  proposicaoAutor,
  proposicaoTema,
} from '@/shared/db/schema'
import { runWithConcurrency } from '../shared/concurrency'
import { defaultDateRange } from '../shared/dates'
import { db } from '../shared/db'
import { readIngestEnv } from '../shared/env'
import { fetchWithRetry } from '../shared/http'
import { paginate } from './camara-client'
import {
  extractDeputadoIdFromUri,
  mapSituacao,
  mapTipoAutoria,
  mapTipoSigla,
} from './proposicoes-mapper'
import {
  camaraAutorSchema,
  camaraProposicaoDetalheSchema,
  camaraProposicaoListagemSchema,
  camaraTemaSchema,
} from './proposicoes-schema'

const CASA = 'CAMARA' as const
const CONCURRENCY = 5
const DEFAULT_DAYS_BACK = 30
const ITENS_POR_PAGINA = 100
const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

interface IngestionStats {
  proposicoesFetched: number
  proposicoesUpserted: number
  proposicoesSkippedTipo: number
  proposicoesSkippedError: number
  temasUpserted: number
  autoresUpserted: number
  autoresSemMatch: number
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

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetchWithRetry(`${BASE_URL}${path}`, {
    headers: {
      accept: 'application/json',
      'user-agent':
        'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)',
    },
  })
  return (await response.json()) as T
}

async function fetchDetalhe(id: string) {
  const json = await fetchJson<{ dados: unknown }>(`/proposicoes/${id}`)
  return camaraProposicaoDetalheSchema.parse(json.dados)
}

async function fetchTemas(id: string) {
  const json = await fetchJson<{ dados: unknown[] }>(`/proposicoes/${id}/temas`)
  const out: Array<{ codigoTema: number; nomeTema: string }> = []
  for (const raw of json.dados) {
    const parsed = camaraTemaSchema.safeParse(raw)
    if (parsed.success) {
      out.push({ codigoTema: parsed.data.codTema, nomeTema: parsed.data.tema })
    }
  }
  return out
}

async function fetchAutores(id: string) {
  const json = await fetchJson<{ dados: unknown[] }>(
    `/proposicoes/${id}/autores`,
  )
  const out: Array<{
    nome: string
    tipoAutoria: 'AUTOR' | 'COAUTOR'
    deputadoSourceId: string | null
  }> = []
  for (const raw of json.dados) {
    const parsed = camaraAutorSchema.safeParse(raw)
    if (!parsed.success) continue
    out.push({
      nome: parsed.data.nome,
      tipoAutoria: mapTipoAutoria(parsed.data.proponente),
      deputadoSourceId: extractDeputadoIdFromUri(parsed.data.uri),
    })
  }
  return out
}

async function processProposicao(
  raw: unknown,
  parlamentarLookup: Map<string, string>,
  stats: IngestionStats,
): Promise<void> {
  const parsed = camaraProposicaoListagemSchema.safeParse(raw)
  if (!parsed.success) {
    stats.proposicoesSkippedError++
    stats.errors.push({
      context: 'proposicao_listagem',
      reason: parsed.error.issues.map((i) => i.message).join('; '),
    })
    return
  }
  const p = parsed.data

  const tipo = mapTipoSigla(p.siglaTipo)
  if (!tipo) {
    // Tipo fora do escopo da Wave 0 (REQ, INC, IND, EMP, ...). Não é erro.
    stats.proposicoesSkippedTipo++
    return
  }

  const id = String(p.id)

  let detalhe: Awaited<ReturnType<typeof fetchDetalhe>>
  let temas: Awaited<ReturnType<typeof fetchTemas>>
  let autores: Awaited<ReturnType<typeof fetchAutores>>
  try {
    ;[detalhe, temas, autores] = await Promise.all([
      fetchDetalhe(id),
      fetchTemas(id),
      fetchAutores(id),
    ])
  } catch (err) {
    stats.proposicoesSkippedError++
    stats.errors.push({
      context: `detalhe:${id}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const situacao = mapSituacao(detalhe.statusProposicao?.descricaoSituacao)
  const regime = detalhe.statusProposicao?.regime ?? null
  const ementaDetalhada = detalhe.ementaDetalhada ?? null

  await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(proposicao)
      .values({
        sourceId: id,
        sourceIdCamara: id,
        tipo,
        numero: p.numero,
        ano: p.ano,
        ementa: p.ementa,
        ementaDetalhada,
        situacao,
        regime,
        trustLevel: 'L1',
        sourceUrl: p.uri,
        sourceUrlCamara: p.uri,
      })
      .onConflictDoUpdate({
        target: [proposicao.tipo, proposicao.numero, proposicao.ano],
        // sourceIdCamara/sourceUrlCamara setados; *_senado preservados
        // (issue #74 — não sobrescrever rastros da outra casa).
        set: {
          sourceId: id,
          sourceIdCamara: id,
          ementa: p.ementa,
          ementaDetalhada,
          situacao,
          regime,
          sourceUrl: p.uri,
          sourceUrlCamara: p.uri,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: proposicao.id })

    const proposicaoId = upserted[0].id

    // Substitui temas/autores: delete + bulk insert na mesma transaction.
    await tx
      .delete(proposicaoTema)
      .where(eq(proposicaoTema.proposicaoId, proposicaoId))
    if (temas.length > 0) {
      await tx.insert(proposicaoTema).values(
        // PK composta (proposicao_id, codigo_tema) — deduplicar caso a API
        // mande o mesmo tema duas vezes.
        Array.from(new Map(temas.map((t) => [t.codigoTema, t])).values()).map(
          (t) => ({
            proposicaoId,
            codigoTema: t.codigoTema,
            nomeTema: t.nomeTema,
          }),
        ),
      )
      stats.temasUpserted += temas.length
    }

    await tx
      .delete(proposicaoAutor)
      .where(eq(proposicaoAutor.proposicaoId, proposicaoId))
    if (autores.length > 0) {
      const rows = autores.map((a) => {
        const parlamentarId = a.deputadoSourceId
          ? (parlamentarLookup.get(a.deputadoSourceId) ?? null)
          : null
        if (a.deputadoSourceId && !parlamentarId) {
          stats.autoresSemMatch++
        }
        return {
          proposicaoId,
          parlamentarId,
          nome: a.nome,
          tipoAutoria: a.tipoAutoria,
        }
      })
      await tx.insert(proposicaoAutor).values(rows)
      stats.autoresUpserted += rows.length
    }
  })

  stats.proposicoesUpserted++
}

export async function ingestProposicoesCamara(
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
    proposicoesFetched: 0,
    proposicoesUpserted: 0,
    proposicoesSkippedTipo: 0,
    proposicoesSkippedError: 0,
    temasUpserted: 0,
    autoresUpserted: 0,
    autoresSemMatch: 0,
    errors: [],
  }

  const items = paginate('/proposicoes', {
    dataApresentacaoInicio: range.dataInicio,
    dataApresentacaoFim: range.dataFim,
    itens: ITENS_POR_PAGINA,
    ordem: 'ASC',
    ordenarPor: 'id',
  })

  await runWithConcurrency(
    items,
    async (raw) => {
      stats.proposicoesFetched++
      await processProposicao(raw, parlamentarLookup, stats)
    },
    CONCURRENCY,
  )

  return stats
}

const started = Date.now()
const env = readIngestEnv()
ingestProposicoesCamara({
  dataInicio: env.DATA_INICIO,
  dataFim: env.DATA_FIM,
})
  .then((stats) => {
    const durationMs = Date.now() - started
    const errorsSample = stats.errors.slice(0, 10)
    const errorsExtra = stats.errors.length - errorsSample.length
    console.log(
      JSON.stringify({
        event: 'ingest_proposicoes_camara_done',
        durationMs,
        proposicoesFetched: stats.proposicoesFetched,
        proposicoesUpserted: stats.proposicoesUpserted,
        proposicoesSkippedTipo: stats.proposicoesSkippedTipo,
        proposicoesSkippedError: stats.proposicoesSkippedError,
        temasUpserted: stats.temasUpserted,
        autoresUpserted: stats.autoresUpserted,
        autoresSemMatch: stats.autoresSemMatch,
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
        event: 'ingest_proposicoes_camara_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    process.exit(2)
  })
