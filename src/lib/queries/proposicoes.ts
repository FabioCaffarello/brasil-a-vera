import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { encodeCursor } from '@/lib/cursor'
import type {
  CursorProposicoesV1Payload,
  CursorTramitacaoV1Payload,
} from '@/lib/queries/cursor-schemas'
import { db } from '@/shared/db'
import {
  estatisticaProposicaoAgregada,
  parlamentar,
  proposicao,
  proposicaoAutor,
  proposicaoTema,
  tramitacao,
  votacao,
} from '@/shared/db/schema'

/** Page-size fixo da listagem /proposicoes (ADR-026 §3). */
export const PROPOSICOES_LISTAGEM_PAGE_SIZE = 20

/** Page-size fixo da tramitação no detalhe da proposição (ADR-026 §3).
 * Wave 8 Sprint 8.3 PR1. Mesma magnitude da listagem por consistência
 * de scroll mental do usuário. */
export const TRAMITACAO_PAGE_SIZE = 20

export type TipoProposicao = 'PL' | 'PEC' | 'PLP' | 'MPV' | 'PDC' | 'PRC'

export type SituacaoProposicao =
  | 'TRAMITANDO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'ARQUIVADA'
  | 'TRANSFORMADA_EM_NORMA'

export const TIPOS_PROPOSICAO: readonly TipoProposicao[] = [
  'PL',
  'PEC',
  'PLP',
  'MPV',
  'PDC',
  'PRC',
] as const

// Ordens cravadas na Wave 8 Sprint 8.1 PR2:
// - recente (default): mais recentes primeiro (ano DESC, numero DESC)
// - antiga: mais antigas primeiro (ano ASC, numero ASC)
// - movimentada: mais recentemente movimentadas primeiro (dias desde
//   última tramitação ASC, NULLS LAST). Exige JOIN com agregada.
// - parada: paradas há mais tempo (dias desde última tramitação DESC,
//   NULLS LAST). Exige JOIN com agregada.
export type OrdemProposicao = 'recente' | 'antiga' | 'movimentada' | 'parada'

export const ORDENS_PROPOSICAO: readonly OrdemProposicao[] = [
  'recente',
  'antiga',
  'movimentada',
  'parada',
] as const

export interface FiltrosProposicao {
  tipo?: TipoProposicao
  ano?: number
  situacao?: SituacaoProposicao
  /** Código de tema (proposicao_tema.codigo_tema). */
  tema?: number
  /** Busca livre: dígitos puros → match exato em numero; texto → ILIKE em ementa. */
  q?: string
  /** Ordem de exibição; default 'recente'. */
  ordem?: OrdemProposicao
}

// Subquery EXISTS para filtrar proposições por tema sem inflar o
// SELECT com JOIN. Proposição pode ter múltiplos temas; EXISTS retorna
// uma linha apenas quando há pelo menos uma correspondência.
function whereForTema(tema: number | undefined) {
  if (!tema) return undefined
  return sql`EXISTS (
    SELECT 1 FROM proposicoes.proposicao_tema pt
    WHERE pt.proposicao_id = ${proposicao.id}
      AND pt.codigo_tema = ${tema}
  )`
}

// Aplica o filtro de busca livre (`q`): se for apenas dígitos, vira match
// exato em `numero` (consome o index proposicao_numero_idx); caso contrário,
// vira ILIKE %q% em `ementa` (sequential scan — sem pg_trgm por decisão
// arquitetural da rodada 2). Retorna undefined quando q está vazio.
function whereForQ(q: string | undefined) {
  const trimmed = q?.trim()
  if (!trimmed) return undefined
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed)
    if (Number.isInteger(n) && n > 0) {
      return eq(proposicao.numero, n)
    }
  }
  return ilike(proposicao.ementa, `%${trimmed}%`)
}

export interface ListProposicoesOpts {
  /** Cursor versionado (ADR-026). Aplica WHERE keyset; ignorado quando a
   * ordem é 'movimentada'/'parada' (chave não-determinística por requerer
   * agregada que pode ter NULLs). */
  cursor?: CursorProposicoesV1Payload
  /** Override do page size. Default PROPOSICOES_LISTAGEM_PAGE_SIZE (20).
   * Export CSV passa 1000 (limit alto, cursor ignorado em qualquer caso). */
  limit?: number
}

export interface ListProposicoesResult {
  rows: Array<{
    id: string
    tipo: TipoProposicao
    numero: number
    ano: number
    ementa: string
    situacao: SituacaoProposicao
    sourceUrl: string
    nEventosTramitacao: number | null
    nAutores: number | null
    nVotacoes: number | null
    diasEmTramitacao: number | null
    diasDesdeUltimaTramitacao: number | null
    ultimoOrgao: string | null
  }>
  /** Token base64url do próximo cursor, ou null quando não há mais páginas
   * OU quando a ordem corrente não suporta cursor pagination. */
  nextCursor: string | null
}

export async function listProposicoes(
  filtros: FiltrosProposicao = {},
  opts: ListProposicoesOpts = {},
): Promise<ListProposicoesResult> {
  const limit = opts.limit ?? PROPOSICOES_LISTAGEM_PAGE_SIZE
  const ordem = filtros.ordem ?? 'recente'
  // Cursor pagination só é aplicada em ordens lexicográficas estáveis
  // (recente/antiga). 'movimentada'/'parada' exigem chave em
  // dias_desde_ultima_tramitacao, que pode ser NULL — keyset não funciona
  // com NULLs em PostgreSQL sem ginástica de COALESCE que não vale a pena
  // no MVP. Para essas ordens: limit fixo, sem "Mostrar mais".
  const cursorFriendly = ordem === 'recente' || ordem === 'antiga'

  const where = []
  if (filtros.tipo) where.push(eq(proposicao.tipo, filtros.tipo))
  if (filtros.ano) where.push(eq(proposicao.ano, filtros.ano))
  if (filtros.situacao) where.push(eq(proposicao.situacao, filtros.situacao))
  const temaClause = whereForTema(filtros.tema)
  if (temaClause) where.push(temaClause)
  const qClause = whereForQ(filtros.q)
  if (qClause) where.push(qClause)

  // Keyset pagination (ADR-026 §1+§4). Tuple compare em (ano, numero, id):
  // continuar onde parou na ordem (DESC para 'recente', ASC para 'antiga').
  if (cursorFriendly && opts.cursor) {
    const c = opts.cursor
    if (ordem === 'recente') {
      where.push(
        sql`(${proposicao.ano} < ${c.a}
          OR (${proposicao.ano} = ${c.a} AND ${proposicao.numero} < ${c.n})
          OR (${proposicao.ano} = ${c.a} AND ${proposicao.numero} = ${c.n} AND ${proposicao.id} < ${c.id}))`,
      )
    } else {
      where.push(
        sql`(${proposicao.ano} > ${c.a}
          OR (${proposicao.ano} = ${c.a} AND ${proposicao.numero} > ${c.n})
          OR (${proposicao.ano} = ${c.a} AND ${proposicao.numero} = ${c.n} AND ${proposicao.id} > ${c.id}))`,
      )
    }
  }

  // Wave 8 Sprint 8.1 PR4 — select inclui campos agregados consumidos
  // pelo ProposicaoCard v2 (mini-barra + footer). LEFT JOIN sempre.
  const baseSelect = {
    id: proposicao.id,
    tipo: proposicao.tipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    situacao: proposicao.situacao,
    sourceUrl: proposicao.sourceUrl,
    nEventosTramitacao: estatisticaProposicaoAgregada.nEventosTramitacao,
    nAutores: estatisticaProposicaoAgregada.nAutores,
    nVotacoes: estatisticaProposicaoAgregada.nVotacoes,
    diasEmTramitacao: estatisticaProposicaoAgregada.diasEmTramitacao,
    diasDesdeUltimaTramitacao:
      estatisticaProposicaoAgregada.diasDesdeUltimaTramitacao,
    ultimoOrgao: estatisticaProposicaoAgregada.ultimoOrgao,
  }

  // LIMIT N+1 para detectar hasMore (e gerar nextCursor a partir do
  // último item da página).
  const limitPlusOne = limit + 1

  let rows: ListProposicoesResult['rows']
  if (ordem === 'movimentada' || ordem === 'parada') {
    const orderExpr =
      ordem === 'movimentada'
        ? sql`${estatisticaProposicaoAgregada.diasDesdeUltimaTramitacao} ASC NULLS LAST`
        : sql`${estatisticaProposicaoAgregada.diasDesdeUltimaTramitacao} DESC NULLS LAST`
    rows = (await db
      .select(baseSelect)
      .from(proposicao)
      .leftJoin(
        estatisticaProposicaoAgregada,
        eq(estatisticaProposicaoAgregada.proposicaoId, proposicao.id),
      )
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(
        orderExpr,
        desc(proposicao.ano),
        desc(proposicao.numero),
        desc(proposicao.id),
      )
      .limit(limit)) as ListProposicoesResult['rows']
    // Sem cursor nessas ordens (ver comentário acima).
    return { rows, nextCursor: null }
  }

  // Ordens lexicográficas — id DESC/ASC como tiebreaker estável (chave
  // keyset). N+1 para detectar hasMore.
  const ordenacao =
    ordem === 'antiga'
      ? [asc(proposicao.ano), asc(proposicao.numero), asc(proposicao.id)]
      : [desc(proposicao.ano), desc(proposicao.numero), desc(proposicao.id)]

  rows = (await db
    .select(baseSelect)
    .from(proposicao)
    .leftJoin(
      estatisticaProposicaoAgregada,
      eq(estatisticaProposicaoAgregada.proposicaoId, proposicao.id),
    )
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(...ordenacao)
    .limit(limitPlusOne)) as ListProposicoesResult['rows']

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  let nextCursor: string | null = null
  if (hasMore) {
    const last = pageRows[pageRows.length - 1]
    if (last) {
      nextCursor = encodeCursor({
        v: 1 as const,
        a: last.ano,
        n: last.numero,
        id: last.id,
      })
    }
  }
  return { rows: pageRows, nextCursor }
}

export async function getProposicaoByChave(
  tipo: TipoProposicao,
  numero: number,
  ano: number,
) {
  const rows = await db
    .select({
      id: proposicao.id,
      sourceId: proposicao.sourceId,
      sourceIdCamara: proposicao.sourceIdCamara,
      sourceIdSenado: proposicao.sourceIdSenado,
      tipo: proposicao.tipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      ementaDetalhada: proposicao.ementaDetalhada,
      situacao: proposicao.situacao,
      regime: proposicao.regime,
      trustLevel: proposicao.trustLevel,
      sourceUrl: proposicao.sourceUrl,
      sourceUrlCamara: proposicao.sourceUrlCamara,
      sourceUrlSenado: proposicao.sourceUrlSenado,
    })
    .from(proposicao)
    .where(
      and(
        eq(proposicao.tipo, tipo),
        eq(proposicao.numero, numero),
        eq(proposicao.ano, ano),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function getTemasByProposicao(proposicaoId: string) {
  return db
    .select({
      codigoTema: proposicaoTema.codigoTema,
      nomeTema: proposicaoTema.nomeTema,
    })
    .from(proposicaoTema)
    .where(eq(proposicaoTema.proposicaoId, proposicaoId))
    .orderBy(asc(proposicaoTema.nomeTema))
}

/** Wave 8 Sprint 8.4 PR2 — Top 6 partidos + agregado "Outros".
 * Cravado decisão #2 da rodada 2: filtro `tipoAutoria='AUTOR'`
 * (coautores não entram). Apenas autores que são parlamentares (com
 * `parlamentar_id NOT NULL`) — autoria por órgão/mesa/comissão não
 * tem partido e fica fora do chart por design.
 *
 * Retorna lista de até 7 itens: top 6 partidos + "Outros" agregado
 * quando há mais partidos. Quando há ≤ 6 partidos, retorna só os
 * partidos sem o "Outros".
 *
 * Lista `nomes` tem até 5 entradas para o tooltip — UI exibe o resto
 * como "...e N outros" (decisão #2 da rodada 2).
 */
export async function getApoioPorPartido(proposicaoId: string): Promise<
  Array<{
    sigla: string
    nome: string
    count: number
    nomes: readonly string[]
  }>
> {
  // Pega TODOS os autores parlamentares principais — agregação top 6
  // + Outros é feita em JS (cardinalidade pequena: ~10-30 partidos
  // distintos no máximo). Mais legível que CTE com window function.
  const rows = await db
    .select({
      partidoSigla: parlamentar.partidoSigla,
      partidoNome: parlamentar.partidoNome,
      nomeAutor: proposicaoAutor.nome,
    })
    .from(proposicaoAutor)
    .innerJoin(parlamentar, eq(parlamentar.id, proposicaoAutor.parlamentarId))
    .where(
      and(
        eq(proposicaoAutor.proposicaoId, proposicaoId),
        eq(proposicaoAutor.tipoAutoria, 'AUTOR'),
      ),
    )

  if (rows.length === 0) return []

  // Agrupa por sigla. Mantém ordem de inserção de nomes (que veio sem
  // ORDER BY, mas Postgres consistente o suficiente em ~30 rows).
  type Agg = { nome: string; nomes: string[] }
  const porSigla = new Map<string, Agg>()
  for (const r of rows) {
    let agg = porSigla.get(r.partidoSigla)
    if (!agg) {
      agg = { nome: r.partidoNome, nomes: [] }
      porSigla.set(r.partidoSigla, agg)
    }
    agg.nomes.push(r.nomeAutor)
  }

  const partidosOrdenados = Array.from(porSigla.entries())
    .map(([sigla, agg]) => ({
      sigla,
      nome: agg.nome,
      count: agg.nomes.length,
      // Lista compacta para tooltip: top 5 nomes. Caller mostra "+N" no
      // restante. Ordena alfabético para apresentação estável.
      nomes: agg.nomes.slice().sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }))
    .sort((a, b) => b.count - a.count || a.sigla.localeCompare(b.sigla))

  if (partidosOrdenados.length <= 6) {
    return partidosOrdenados
  }

  const top6 = partidosOrdenados.slice(0, 6)
  const outros = partidosOrdenados.slice(6)
  const outrosCount = outros.reduce((acc, p) => acc + p.count, 0)
  return [
    ...top6,
    {
      sigla: 'Outros',
      nome: '',
      count: outrosCount,
      // Para o tooltip de "Outros", lista as siglas dos partidos que
      // entraram no agregado (alfabético) — informa o usuário o que
      // ficou de fora.
      nomes: outros
        .map((p) => p.sigla)
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    },
  ]
}

export interface AutorDeProposicao {
  id: string
  nome: string
  tipoAutoria: string
  parlamentarId: string | null
  parlamentarCasa: string | null
  parlamentarPartidoSigla: string | null
  parlamentarUf: string | null
}

export async function getAutoresByProposicao(
  proposicaoId: string,
): Promise<AutorDeProposicao[]> {
  return db
    .select({
      id: proposicaoAutor.id,
      nome: proposicaoAutor.nome,
      tipoAutoria: proposicaoAutor.tipoAutoria,
      parlamentarId: parlamentar.id,
      parlamentarCasa: parlamentar.casa,
      parlamentarPartidoSigla: parlamentar.partidoSigla,
      parlamentarUf: parlamentar.uf,
    })
    .from(proposicaoAutor)
    .leftJoin(parlamentar, eq(parlamentar.id, proposicaoAutor.parlamentarId))
    .where(eq(proposicaoAutor.proposicaoId, proposicaoId))
    .orderBy(
      // AUTOR antes de COAUTOR (D antes de O na ordenação inversa)
      asc(proposicaoAutor.tipoAutoria),
      asc(proposicaoAutor.nome),
    )
}

/** Wave 8 Sprint 8.4 PR3 — Votos consolidados (donut do detalhe).
 *
 * Agrega Sim/Não/Abstenção/Ausentes de TODAS as votações vinculadas à
 * proposição + retorna metadados da última votação separadamente (para
 * honestidade P2 — uma votação recente que discorde do agregado merece
 * destaque, não pode ficar diluída no número grande).
 *
 * Retorna null quando proposição não tem votações vinculadas. Caller
 * trata empty state.
 */
export async function getVotosConsolidados(proposicaoId: string): Promise<{
  sim: number
  nao: number
  abstencao: number
  ausentes: number
  ultima: {
    sim: number
    nao: number
    abstencao: number
    ausentes: number
    dataHora: string
    aprovada: boolean
    descricao: string
  } | null
} | null> {
  const rows = await db
    .select({
      sim: votacao.votosSim,
      nao: votacao.votosNao,
      abstencao: votacao.abstencoes,
      ausentes: votacao.ausentes,
      dataHora: votacao.dataHora,
      aprovada: votacao.aprovada,
      descricao: votacao.descricao,
    })
    .from(votacao)
    .where(eq(votacao.proposicaoId, proposicaoId))
    .orderBy(desc(votacao.dataHora))

  if (rows.length === 0) return null

  const agregado = rows.reduce(
    (acc, r) => ({
      sim: acc.sim + r.sim,
      nao: acc.nao + r.nao,
      abstencao: acc.abstencao + r.abstencao,
      ausentes: acc.ausentes + (r.ausentes ?? 0),
    }),
    { sim: 0, nao: 0, abstencao: 0, ausentes: 0 },
  )

  const ultimaRow = rows[0]
  const ultima = ultimaRow
    ? {
        sim: ultimaRow.sim,
        nao: ultimaRow.nao,
        abstencao: ultimaRow.abstencao,
        ausentes: ultimaRow.ausentes ?? 0,
        dataHora:
          ultimaRow.dataHora instanceof Date
            ? ultimaRow.dataHora.toISOString()
            : String(ultimaRow.dataHora),
        aprovada: ultimaRow.aprovada,
        descricao: ultimaRow.descricao,
      }
    : null

  return { ...agregado, ultima }
}

// Wave 8 Sprint 8.3 PR3 — filtros mini em Votações vinculadas.
// Cardinalidade naturalmente baixa por proposição (raramente > 20),
// então sem cursor pagination — apenas filtros que estreitam o
// universo via FilterChips.
export type VotacoesResultadoFiltro = 'todos' | 'aprovadas' | 'rejeitadas'
export type VotacoesCasaFiltro = 'todas' | 'CAMARA' | 'SENADO'

export const VOTACOES_RESULTADO_FILTROS: readonly VotacoesResultadoFiltro[] = [
  'todos',
  'aprovadas',
  'rejeitadas',
] as const

export const VOTACOES_CASA_FILTROS: readonly VotacoesCasaFiltro[] = [
  'todas',
  'CAMARA',
  'SENADO',
] as const

export interface VotacoesOpts {
  resultado?: VotacoesResultadoFiltro
  casa?: VotacoesCasaFiltro
}

export async function getVotacoesByProposicao(
  proposicaoId: string,
  opts: VotacoesOpts = {},
) {
  const resultado = opts.resultado ?? 'todos'
  const casa = opts.casa ?? 'todas'

  const where = [eq(votacao.proposicaoId, proposicaoId)]
  if (resultado === 'aprovadas') {
    where.push(eq(votacao.aprovada, true))
  } else if (resultado === 'rejeitadas') {
    where.push(eq(votacao.aprovada, false))
  }
  if (casa !== 'todas') {
    where.push(eq(votacao.casa, casa))
  }

  return db
    .select({
      id: votacao.id,
      sourceId: votacao.sourceId,
      casa: votacao.casa,
      dataHora: votacao.dataHora,
      descricao: votacao.descricao,
      orgao: votacao.orgao,
      aprovada: votacao.aprovada,
      votosSim: votacao.votosSim,
      votosNao: votacao.votosNao,
    })
    .from(votacao)
    .where(and(...where))
    .orderBy(desc(votacao.dataHora))
}

export interface TramitacaoEvento {
  id: string
  data: Date
  orgao: string
  descricaoResumida: string
  descricaoCompleta: string | null
  situacaoResultante: string | null
}

// Lista canônica de substrings que caracterizam "marco importante" de
// tramitação — Wave 8 Sprint 8.3 PR2. Conservadora (poucas keywords muito
// comuns) para não inflar falsos positivos. Aplicada via ILIKE %X% em
// descricao_resumida E situacao_resultante (basta um casar).
//
// Cravado plano §Sprint 8.3 PR2: "apresentação, aprovação em comissão,
// aprovação em plenário, sanção/veto". Expandi com "publica", "rejeit"
// e "arquiv" porque são marcos terminais equivalentes na narrativa
// cívica (eventos que mudam a situação geral da proposição).
export const MARCOS_TRAMITACAO_KEYWORDS = [
  'Apresenta', // Apresentação, Apresentado
  'Aprova', // Aprovação, Aprovado, Aprovada
  'Sanção',
  'Sanciona', // Sancionado
  'Veto',
  'Publica', // Publicação
  'Rejeit', // Rejeitado, Rejeitada
  'Arquiv', // Arquivado, Arquivada
] as const

export type TramitacaoFiltro = 'todos' | 'marcos'

export const TRAMITACAO_FILTROS: readonly TramitacaoFiltro[] = [
  'todos',
  'marcos',
] as const

export interface TramitacaoOpts {
  /** Cursor versionado (ADR-026 + CursorTramitacaoV1). */
  cursor?: CursorTramitacaoV1Payload
  /** Override do page size. Default TRAMITACAO_PAGE_SIZE (20). */
  limit?: number
  /** Filtro de "marcos importantes" (Wave 8 Sprint 8.3 PR2).
   * Default 'todos'. 'marcos' aplica ILIKE com MARCOS_TRAMITACAO_KEYWORDS. */
  filtro?: TramitacaoFiltro
}

export interface TramitacaoResult {
  rows: TramitacaoEvento[]
  /** Token base64url do próximo cursor, ou null quando não há mais. */
  nextCursor: string | null
}

// Timeline da proposição — Sprint 6.2 + Wave 8 Sprint 8.3 PR1 (cursor
// pagination ADR-026). Eventos ordenados do mais recente pro mais antigo
// (data DESC, id DESC tiebreaker estável). Cacheado por (proposicao_id,
// cursor) — primeira página tem key estável, páginas subsequentes
// cacheiam independente quando o mesmo URL ressurgir.
//
// Tramitação muda poucas vezes por semana (dominado pelo cron), então
// TTL longo é seguro. Cache miss em página interna paga 1 SELECT.
export async function getTramitacaoByProposicao(
  proposicaoId: string,
  opts: TramitacaoOpts = {},
): Promise<TramitacaoResult> {
  const limit = opts.limit ?? TRAMITACAO_PAGE_SIZE
  const cursor = opts.cursor
  const filtro = opts.filtro ?? 'todos'
  // Cache key inclui cursor + filtro para evitar colisão entre páginas e
  // entre filtros. Primeira página de cada filtro usa key estável `:p1`;
  // demais usam o token encoded.
  const cursorPart = cursor ? encodeCursor(cursor) : 'p1'
  const cacheKey = `proposicao:tramitacao:${proposicaoId}:f:${filtro}:c:${cursorPart}:limit:${limit}`

  return cached(cacheKey, TTL.proposicaoEmTramitacao, async () => {
    const whereClauses = [eq(tramitacao.proposicaoId, proposicaoId)]
    if (cursor) {
      // Tuple compare em (data, id): continuar onde parou na ordem DESC.
      const cursorDate = new Date(cursor.d)
      whereClauses.push(
        sql`(${tramitacao.data} < ${cursorDate}
          OR (${tramitacao.data} = ${cursorDate} AND ${tramitacao.id} < ${cursor.id}))`,
      )
    }
    if (filtro === 'marcos') {
      // OR sobre todas as keywords aplicadas a 2 colunas (descricaoResumida
      // e situacaoResultante). ILIKE para case-insensitive sem locale-pain.
      // Sequential scan aceitável: tramitação tem N pequeno por proposição.
      const marcoClauses = MARCOS_TRAMITACAO_KEYWORDS.flatMap((kw) => [
        ilike(tramitacao.descricaoResumida, `%${kw}%`),
        ilike(tramitacao.situacaoResultante, `%${kw}%`),
      ])
      const marcoOr = or(...marcoClauses)
      if (marcoOr) whereClauses.push(marcoOr)
    }

    const limitPlusOne = limit + 1
    const rows = await db
      .select({
        id: tramitacao.id,
        data: tramitacao.data,
        orgao: tramitacao.orgao,
        descricaoResumida: tramitacao.descricaoResumida,
        descricaoCompleta: tramitacao.descricaoCompleta,
        situacaoResultante: tramitacao.situacaoResultante,
      })
      .from(tramitacao)
      .where(and(...whereClauses))
      .orderBy(desc(tramitacao.data), desc(tramitacao.id))
      .limit(limitPlusOne)

    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    let nextCursor: string | null = null
    if (hasMore) {
      const last = pageRows[pageRows.length - 1]
      if (last) {
        // `data` vem como Date do Drizzle. epoch ms para serialização.
        const lastDate =
          last.data instanceof Date ? last.data : new Date(last.data)
        nextCursor = encodeCursor({
          v: 1 as const,
          d: lastDate.getTime(),
          id: last.id,
        })
      }
    }
    return { rows: pageRows, nextCursor }
  })
}

// Counter para honestidade de truncagem no export CSV (Sprint 3.0). Mesmas
// cláusulas WHERE de `listProposicoes` — manter sincronizado quando filtros
// mudarem. Ordenação não conta aqui (COUNT(*) ignora ORDER BY).
export async function countProposicoes(
  filtros: FiltrosProposicao = {},
): Promise<number> {
  const where = []
  if (filtros.tipo) where.push(eq(proposicao.tipo, filtros.tipo))
  if (filtros.ano) where.push(eq(proposicao.ano, filtros.ano))
  if (filtros.situacao) where.push(eq(proposicao.situacao, filtros.situacao))
  const temaClause = whereForTema(filtros.tema)
  if (temaClause) where.push(temaClause)
  const qClause = whereForQ(filtros.q)
  if (qClause) where.push(qClause)

  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(proposicao)
    .where(where.length > 0 ? and(...where) : undefined)
  return rows[0]?.total ?? 0
}

export async function getAnosDistintos(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ ano: proposicao.ano })
    .from(proposicao)
    .orderBy(desc(proposicao.ano))
  return rows.map((r) => r.ano)
}

export interface TemaDistinto {
  codigo: number
  nome: string
}

// Catálogo de temas distintos para o Combobox da listagem (Wave 8 Sprint
// 8.1 PR3). DISTINCT ON garante uma linha por codigo_tema (ordem
// alfabética por nome para escolher o nome canônico — o mesmo codigo
// pode aparecer com grafias ligeiramente diferentes em sources Câmara
// vs Senado). ORDER BY final pelo nome para apresentação amigável.
//
// Cache com TTL alto: catálogo de temas legislativos muda raramente
// (novos temas só quando a Câmara/Senado cataloga uma nova categoria).
export async function getTemasDistintos(): Promise<TemaDistinto[]> {
  return cached(
    'proposicoes:temas_distintos',
    TTL.proposicoesStatsGlobais,
    async () => {
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (codigo_tema)
          codigo_tema AS codigo,
          nome_tema AS nome
        FROM proposicoes.proposicao_tema
        ORDER BY codigo_tema, nome_tema ASC
      `)
      return (rows.rows as { codigo: number; nome: string }[])
        .map((r) => ({ codigo: Number(r.codigo), nome: String(r.nome) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },
  )
}
