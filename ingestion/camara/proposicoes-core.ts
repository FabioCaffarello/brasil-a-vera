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
import { fetchWithRetry } from '../shared/http'
import { sanitizeTexto, sanitizeTextoNullable } from '../shared/texto'
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

// Core puro da ingestão de proposições Câmara — funções e tipos exportáveis,
// sem top-level side-effects. Entry-point que dispara `ingestProposicoesCamara`
// vive em `proposicoes.ts`. Backfill (`backfill-votacao-proposicao.ts`) importa
// apenas `ingestProposicaoBySourceId` daqui — sem disparar a ingestão completa
// no import (memória pos-2026-05-15: vazamento de side-effect ao importar).

const CASA = 'CAMARA' as const
const CONCURRENCY = 5
const DEFAULT_DAYS_BACK = 30
const ITENS_POR_PAGINA = 100
const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

export interface IngestionStats {
  proposicoesFetched: number
  proposicoesUpserted: number
  proposicoesSkippedTipo: number
  proposicoesSkippedError: number
  temasUpserted: number
  autoresUpserted: number
  autoresSemMatch: number
  errors: Array<{ context: string; reason: string }>
}

// Stats parcial — auto-fetch reverso no backfill (Sprint 3.0.5 Bloco 3)
// usa só os campos do core; campos exclusivos da listagem
// (proposicoesFetched) não se aplicam quando o caller já sabe o source_id.
export interface ProposicaoIngestStatsCore {
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

function buildProposicaoUri(sourceId: string): string {
  return `${BASE_URL}/proposicoes/${sourceId}`
}

/**
 * Fetcha e faz upsert de uma proposição da Câmara a partir do source_id.
 * Usada (a) pela ingestão normal via listagem (após pré-validar siglaTipo)
 * e (b) pelo backfill votacao→proposicao quando a referência aponta para
 * proposição ainda não ingerida (auto-fetch reverso).
 *
 * Retorna o id interno da proposição inserida/atualizada, ou null se foi
 * skipada por tipo fora de escopo ou erro de fetch.
 */
export async function ingestProposicaoBySourceId(
  sourceId: string,
  parlamentarLookup: Map<string, string>,
  stats: ProposicaoIngestStatsCore,
): Promise<string | null> {
  let detalhe: Awaited<ReturnType<typeof fetchDetalhe>>
  let temas: Awaited<ReturnType<typeof fetchTemas>>
  let autores: Awaited<ReturnType<typeof fetchAutores>>
  try {
    ;[detalhe, temas, autores] = await Promise.all([
      fetchDetalhe(sourceId),
      fetchTemas(sourceId),
      fetchAutores(sourceId),
    ])
  } catch (err) {
    stats.proposicoesSkippedError++
    stats.errors.push({
      context: `detalhe:${sourceId}`,
      reason: err instanceof Error ? err.message : String(err),
    })
    return null
  }

  const tipo = mapTipoSigla(detalhe.siglaTipo)
  if (!tipo) {
    // Tipo fora do escopo (REQ, INC, IND, EMP, ...). Não é erro.
    stats.proposicoesSkippedTipo++
    return null
  }

  const uri = buildProposicaoUri(sourceId)
  const situacao = mapSituacao(detalhe.statusProposicao?.descricaoSituacao)
  const regime = detalhe.statusProposicao?.regime ?? null
  // sanitizeTexto: a fonte embute soft hyphen/controles na ementa
  // ("Sa­úde" renderizado como "Sa¬úde") — auditoria UX 2026-07-20, Onda C.
  const ementa = sanitizeTexto(detalhe.ementa)
  const ementaDetalhada = sanitizeTextoNullable(detalhe.ementaDetalhada)

  const proposicaoId = await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(proposicao)
      .values({
        sourceId,
        sourceIdCamara: sourceId,
        tipo,
        numero: detalhe.numero,
        ano: detalhe.ano,
        ementa,
        ementaDetalhada,
        situacao,
        regime,
        trustLevel: 'L1',
        sourceUrl: uri,
        sourceUrlCamara: uri,
      })
      .onConflictDoUpdate({
        target: [proposicao.tipo, proposicao.numero, proposicao.ano],
        // sourceIdCamara/sourceUrlCamara setados; *_senado preservados
        // (issue #74 — não sobrescrever rastros da outra casa).
        set: {
          sourceId,
          sourceIdCamara: sourceId,
          ementa,
          ementaDetalhada,
          situacao,
          regime,
          sourceUrl: uri,
          sourceUrlCamara: uri,
          ingestedAt: sql`now()`,
        },
      })
      .returning({ id: proposicao.id })

    const id = upserted[0].id

    // Substitui temas/autores: delete + bulk insert na mesma transaction.
    await tx.delete(proposicaoTema).where(eq(proposicaoTema.proposicaoId, id))
    if (temas.length > 0) {
      await tx.insert(proposicaoTema).values(
        // PK composta (proposicao_id, codigo_tema) — deduplicar caso a API
        // mande o mesmo tema duas vezes.
        Array.from(new Map(temas.map((t) => [t.codigoTema, t])).values()).map(
          (t) => ({
            proposicaoId: id,
            codigoTema: t.codigoTema,
            nomeTema: t.nomeTema,
          }),
        ),
      )
      stats.temasUpserted += temas.length
    }

    await tx.delete(proposicaoAutor).where(eq(proposicaoAutor.proposicaoId, id))
    if (autores.length > 0) {
      const rows = autores.map((a) => {
        const parlamentarId = a.deputadoSourceId
          ? (parlamentarLookup.get(a.deputadoSourceId) ?? null)
          : null
        if (a.deputadoSourceId && !parlamentarId) {
          stats.autoresSemMatch++
        }
        return {
          proposicaoId: id,
          parlamentarId,
          nome: a.nome,
          tipoAutoria: a.tipoAutoria,
        }
      })
      await tx.insert(proposicaoAutor).values(rows)
      stats.autoresUpserted += rows.length
    }
    return id
  })

  stats.proposicoesUpserted++
  return proposicaoId
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

  // Pré-skip: tipo fora de escopo evita 3 fetches HTTP por proposição
  // sem benefício (ingestProposicaoBySourceId também faria o skip, mas
  // depois do fetch).
  if (!mapTipoSigla(p.siglaTipo)) {
    stats.proposicoesSkippedTipo++
    return
  }

  await ingestProposicaoBySourceId(String(p.id), parlamentarLookup, stats)
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
