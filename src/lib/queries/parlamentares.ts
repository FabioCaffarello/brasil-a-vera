import { and, asc, count, desc, eq, ilike, sql, sum } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { encodeCursor } from '@/lib/cursor'
import type {
  CursorGastosV1Payload,
  CursorParlamentaresV1Payload,
  CursorProposicoesV1Payload,
  CursorVotosV1Payload,
} from '@/lib/queries/cursor-schemas'
import { estatisticaParlamentarAgregada } from '@/modules/parlamentares/domain/schema'
import { db } from '@/shared/db'
import {
  gasto,
  parlamentar,
  proposicao,
  proposicaoAutor,
  votacao,
  votoNominal,
} from '@/shared/db/schema'

export type Casa = 'CAMARA' | 'SENADO'

export type OrdemListagem = 'nome' | 'alinhamento' | 'gasto' | 'proposicoes'

export const ORDENS_LISTAGEM: OrdemListagem[] = [
  'nome',
  'alinhamento',
  'gasto',
  'proposicoes',
]

export interface FiltrosParlamentar {
  casa?: Casa
  partido?: string
  uf?: string
  /** Busca por nome via ILIKE '%termo%'. Trim aplicado antes da query. */
  q?: string
  /** Ordenação. Default 'nome' ASC. */
  ordem?: OrdemListagem
}

export const PARLAMENTARES_LISTAGEM_PAGE_SIZE = 24

// Projeção compartilhada entre o fetch-all (export) e o paginado (listagem) —
// consumida pelo ParlamentarCard v2 (barra de alinhamento) + drawer de preview
// (proposições/gasto/percentil, já no LEFT JOIN, custo zero).
const parlamentarListSelect = {
  id: parlamentar.id,
  nome: parlamentar.nome,
  casa: parlamentar.casa,
  partidoSigla: parlamentar.partidoSigla,
  uf: parlamentar.uf,
  urlFoto: parlamentar.urlFoto,
  legislatura: parlamentar.legislatura,
  sourceUrl: parlamentar.sourceUrl,
  pctAlinhamento: estatisticaParlamentarAgregada.pctAlinhamento,
  votacoesAnalisadas: estatisticaParlamentarAgregada.votacoesAnalisadas,
  proposicoesCount: estatisticaParlamentarAgregada.proposicoesCount,
  gastoTotalAno: estatisticaParlamentarAgregada.gastoTotalAno,
  percentilGastoCasa: estatisticaParlamentarAgregada.percentilGastoCasa,
}

function buildParlamentaresWhere(
  filtros: FiltrosParlamentar,
  q: string | undefined,
) {
  const whereClauses = []
  if (filtros.casa) whereClauses.push(eq(parlamentar.casa, filtros.casa))
  if (filtros.partido)
    whereClauses.push(eq(parlamentar.partidoSigla, filtros.partido))
  if (filtros.uf) whereClauses.push(eq(parlamentar.uf, filtros.uf))
  if (q) whereClauses.push(ilike(parlamentar.nome, `%${q}%`))
  return whereClauses
}

// Ordens não-nome dependem da tabela agregada (Sprint 7.0 PR1). LEFT JOIN
// preserva parlamentares sem agregado (recém-empossados, suplência atípica) —
// caem no fim via NULLS LAST + tiebreak por nome ASC. A ordem `nome` ganha
// `id ASC` como tiebreaker para o keyset ser determinístico (nomes repetem).
function parlamentaresOrderBy(ordem: OrdemListagem) {
  switch (ordem) {
    case 'alinhamento':
      return sql`${estatisticaParlamentarAgregada.pctAlinhamento} DESC NULLS LAST, ${parlamentar.nome} ASC`
    case 'gasto':
      return sql`${estatisticaParlamentarAgregada.gastoTotalAno} DESC NULLS LAST, ${parlamentar.nome} ASC`
    case 'proposicoes':
      return sql`${estatisticaParlamentarAgregada.proposicoesCount} DESC NULLS LAST, ${parlamentar.nome} ASC`
    default:
      return sql`${parlamentar.nome} ASC, ${parlamentar.id} ASC`
  }
}

// Fetch-all (sem limite) — consumido pelo export CSV, que precisa de TODAS as
// linhas do recorte. A listagem usa `listParlamentaresPaginado`.
export async function listParlamentares(filtros: FiltrosParlamentar = {}) {
  const q = filtros.q?.trim()
  const ordem = filtros.ordem ?? 'nome'

  const key = `parlamentares:list:casa=${filtros.casa ?? '_'}:partido=${filtros.partido ?? '_'}:uf=${filtros.uf ?? '_'}:q=${q ?? '_'}:ordem=${ordem}`
  return cached(key, TTL.listagemFiltrada, async () => {
    const where = buildParlamentaresWhere(filtros, q)
    return db
      .select(parlamentarListSelect)
      .from(parlamentar)
      .leftJoin(
        estatisticaParlamentarAgregada,
        eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
      )
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(parlamentaresOrderBy(ordem))
  })
}

export type ParlamentarListRow = Awaited<
  ReturnType<typeof listParlamentares>
>[number]

export interface ListParlamentaresOpts {
  limit?: number
  cursor?: CursorParlamentaresV1Payload
}

export interface ListParlamentaresPage {
  rows: ParlamentarListRow[]
  nextCursor: string | null
}

/**
 * Listagem paginada por cursor (ADR-026). Só a ordem `nome` cursoriza
 * (keyset `nome ASC, id ASC`). As ordens agregadas (alinhamento/gasto/
 * proposicoes) ordenam por coluna nullable com NULLS LAST → cap por LIMIT
 * fixo, sem cursor (precedente das ordens 'movimentada'/'parada' de
 * proposições). Em todos os casos lê no máximo `limit`(+1) linhas — fim do
 * fetch-all de ~513 cards.
 */
export async function listParlamentaresPaginado(
  filtros: FiltrosParlamentar = {},
  opts: ListParlamentaresOpts = {},
): Promise<ListParlamentaresPage> {
  const q = filtros.q?.trim()
  const ordem = filtros.ordem ?? 'nome'
  const limit = opts.limit ?? PARLAMENTARES_LISTAGEM_PAGE_SIZE
  const cursorFriendly = ordem === 'nome'

  const cursorPart =
    cursorFriendly && opts.cursor
      ? `${opts.cursor.nome}_${opts.cursor.id}`
      : 'p1'
  const key = `parlamentares:page:casa=${filtros.casa ?? '_'}:partido=${filtros.partido ?? '_'}:uf=${filtros.uf ?? '_'}:q=${q ?? '_'}:ordem=${ordem}:limit=${limit}:cursor=${cursorPart}`

  return cached(key, TTL.listagemFiltrada, async () => {
    const where = buildParlamentaresWhere(filtros, q)

    // Ordens agregadas (nullable + NULLS LAST): cap por LIMIT, sem cursor.
    if (!cursorFriendly) {
      const rows = (await db
        .select(parlamentarListSelect)
        .from(parlamentar)
        .leftJoin(
          estatisticaParlamentarAgregada,
          eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
        )
        .where(where.length > 0 ? and(...where) : undefined)
        .orderBy(parlamentaresOrderBy(ordem))
        .limit(limit)) as ParlamentarListRow[]
      return { rows, nextCursor: null }
    }

    // Keyset (nome ASC, id ASC) — tuple compare: continuar onde parou.
    if (opts.cursor) {
      const c = opts.cursor
      where.push(
        sql`(${parlamentar.nome} > ${c.nome}
        OR (${parlamentar.nome} = ${c.nome} AND ${parlamentar.id} > ${c.id}))`,
      )
    }

    const limitPlusOne = limit + 1
    const rows = (await db
      .select(parlamentarListSelect)
      .from(parlamentar)
      .leftJoin(
        estatisticaParlamentarAgregada,
        eq(estatisticaParlamentarAgregada.parlamentarId, parlamentar.id),
      )
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(asc(parlamentar.nome), asc(parlamentar.id))
      .limit(limitPlusOne)) as ParlamentarListRow[]

    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    let nextCursor: string | null = null
    if (hasMore) {
      const last = pageRows[pageRows.length - 1]
      if (last) {
        nextCursor = encodeCursor({
          v: 1 as const,
          nome: last.nome,
          id: last.id,
        })
      }
    }
    return { rows: pageRows, nextCursor }
  })
}

export async function countParlamentares(
  filtros: FiltrosParlamentar = {},
): Promise<number> {
  const q = filtros.q?.trim()
  const key = `parlamentares:count:casa=${filtros.casa ?? '_'}:partido=${filtros.partido ?? '_'}:uf=${filtros.uf ?? '_'}:q=${q ?? '_'}`
  return cached(key, TTL.listagemFiltrada, async () => {
    const where = buildParlamentaresWhere(filtros, q)
    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(parlamentar)
      .where(where.length > 0 ? and(...where) : undefined)
    return rows[0]?.total ?? 0
  })
}

export async function getParlamentarById(id: string) {
  return cached(`parlamentar:id:${id}`, TTL.parlamentarPerfil, async () => {
    const rows = await db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        nomeCivil: parlamentar.nomeCivil,
        casa: parlamentar.casa,
        partidoSigla: parlamentar.partidoSigla,
        partidoNome: parlamentar.partidoNome,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
        situacaoMandato: parlamentar.situacaoMandato,
        legislatura: parlamentar.legislatura,
        trustLevel: parlamentar.trustLevel,
        sourceUrl: parlamentar.sourceUrl,
        // Perfil biográfico (ADR-049).
        escolaridade: parlamentar.escolaridade,
        dataNascimento: parlamentar.dataNascimento,
        municipioNascimento: parlamentar.municipioNascimento,
        ufNascimento: parlamentar.ufNascimento,
        profissao: parlamentar.profissao,
      })
      .from(parlamentar)
      .where(eq(parlamentar.id, id))
      .limit(1)
    return rows[0] ?? null
  })
}

export type VotosPeriodoFilter = '30d' | '90d' | '12m' | 'all'
export type VotosAlinhamentoFilter = 'alinhado' | 'divergente' | 'todos'

export const VOTOS_PERIODOS: VotosPeriodoFilter[] = ['all', '30d', '90d', '12m']
export const VOTOS_ALINHAMENTOS: VotosAlinhamentoFilter[] = [
  'todos',
  'alinhado',
  'divergente',
]

/** Page-size fixo (ADR-026 §3 — não configurável por consumer). */
export const VOTOS_PAGE_SIZE = 20

export interface VotosRecentesOpts {
  cursor?: CursorVotosV1Payload
  periodo?: VotosPeriodoFilter
  alinhamento?: VotosAlinhamentoFilter
}

export interface VotoRecenteRow {
  votoNominalId: string
  voto: string
  votacaoId: string
  votacaoSourceId: string
  dataHora: Date | string
  descricao: string
  orgao: string
  casa: string
  aprovada: boolean
  orientacao: string | null
}

export interface VotosRecentesResult {
  rows: VotoRecenteRow[]
  /** Token do próximo cursor (já encoded), ou null quando não há mais
   * páginas. Caller monta href como `?votos_after=${nextCursor}#votos`. */
  nextCursor: string | null
}

// Wave 7 Sprint 7.3 PR1 — refactor de getVotosRecentes para cursor
// pagination (ADR-026) + filtros mini de período e alinhamento.
//
// Mudança breaking: assinatura passa de `(parlamentarId, limit?)` para
// `(parlamentarId, opts?)` retornando `{rows, nextCursor}` em vez de
// array puro. Caller atual em src/app/parlamentares/[id]/page.tsx
// atualizado no mesmo PR.
//
// Implementação: LEFT JOIN com orientacao_bancada permite filtrar por
// alinhamento sem 2ª round-trip. ORDER BY (data_hora DESC, voto_nominal_id
// DESC) com keyset pagination via WHERE composto (Postgres não suporta
// tuple comparison direto via drizzle). LIMIT N+1 para detectar próxima
// página sem COUNT.
export async function getVotosRecentes(
  parlamentarId: string,
  opts: VotosRecentesOpts = {},
): Promise<VotosRecentesResult> {
  const cursor = opts.cursor
  const periodo = opts.periodo ?? 'all'
  const alinhamento = opts.alinhamento ?? 'todos'

  const whereClauses = [eq(votoNominal.parlamentarId, parlamentarId)]

  // Filtro de período (data_hora >= now() - interval).
  if (periodo !== 'all') {
    const interval =
      periodo === '30d'
        ? '30 days'
        : periodo === '90d'
          ? '90 days'
          : '12 months'
    whereClauses.push(sql`${votacao.dataHora} >= now() - ${interval}::interval`)
  }

  // Keyset pagination (ADR-026). Tuple comparison: ORDER BY (dt, id) DESC
  // → continuar onde parou: `dt < cursor.dt OR (dt = cursor.dt AND id < cursor.id)`.
  // Drizzle não tem helper de tuple compare; SQL puro aqui.
  if (cursor) {
    const cursorDate = new Date(cursor.d)
    whereClauses.push(
      sql`(${votacao.dataHora} < ${cursorDate} OR (${votacao.dataHora} = ${cursorDate} AND ${votoNominal.id} < ${cursor.id}))`,
    )
  }

  // Filtro de alinhamento (depende de orientacao_bancada do partido do
  // parlamentar). Aplica regras da função pura `classifyAlinhamento`:
  // - alinhado: voto != AUSENTE AND orient != LIBERADO AND voto = orient
  // - divergente: voto != AUSENTE AND orient != LIBERADO AND voto != orient
  if (alinhamento === 'alinhado') {
    whereClauses.push(
      sql`${votoNominal.voto} != 'AUSENTE' AND orientacao_bancada.orientacao != 'LIBERADO' AND ${votoNominal.voto}::text = orientacao_bancada.orientacao::text`,
    )
  } else if (alinhamento === 'divergente') {
    whereClauses.push(
      sql`${votoNominal.voto} != 'AUSENTE' AND orientacao_bancada.orientacao != 'LIBERADO' AND ${votoNominal.voto}::text != orientacao_bancada.orientacao::text`,
    )
  }

  // LIMIT N+1 → se vier 21, há próxima página; descartamos o extra.
  const limitPlusOne = VOTOS_PAGE_SIZE + 1

  const rows = await db
    .select({
      votoNominalId: votoNominal.id,
      voto: votoNominal.voto,
      votacaoId: votacao.id,
      votacaoSourceId: votacao.sourceId,
      dataHora: votacao.dataHora,
      descricao: votacao.descricao,
      orgao: votacao.orgao,
      casa: votacao.casa,
      aprovada: votacao.aprovada,
      orientacao: sql<string | null>`orientacao_bancada.orientacao::text`.as(
        'orientacao',
      ),
    })
    .from(votoNominal)
    .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
    .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
    .leftJoin(
      sql`votacoes.orientacao_bancada`,
      sql`orientacao_bancada.votacao_id = ${votoNominal.votacaoId} AND orientacao_bancada.partido_sigla = ${parlamentar.partidoSigla}`,
    )
    .where(and(...whereClauses))
    .orderBy(desc(votacao.dataHora), desc(votoNominal.id))
    .limit(limitPlusOne)

  const hasMore = rows.length > VOTOS_PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, VOTOS_PAGE_SIZE) : rows

  let nextCursor: string | null = null
  if (hasMore) {
    const last = pageRows[pageRows.length - 1]
    if (last) {
      const dt =
        last.dataHora instanceof Date ? last.dataHora : new Date(last.dataHora)
      nextCursor = encodeCursor({
        v: 1 as const,
        d: dt.getTime(),
        id: last.votoNominalId,
      })
    }
  }

  return { rows: pageRows as VotoRecenteRow[], nextCursor }
}

export type ProposicaoTipoFilter =
  | 'todos'
  | 'PL'
  | 'PEC'
  | 'PLP'
  | 'MPV'
  | 'PDC'
  | 'PRC'
export type ProposicaoSituacaoFilter =
  | 'todas'
  | 'TRAMITANDO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'ARQUIVADA'
  | 'TRANSFORMADA_EM_NORMA'

export const PROPOSICAO_TIPOS: ProposicaoTipoFilter[] = [
  'todos',
  'PL',
  'PEC',
  'PLP',
  'MPV',
  'PDC',
  'PRC',
]
export const PROPOSICAO_SITUACOES: ProposicaoSituacaoFilter[] = [
  'todas',
  'TRAMITANDO',
  'APROVADA',
  'REJEITADA',
  'ARQUIVADA',
  'TRANSFORMADA_EM_NORMA',
]

/** Page-size fixo (ADR-026 §3). */
export const PROPOSICOES_PAGE_SIZE = 20

export interface ProposicoesAutoradasOpts {
  cursor?: CursorProposicoesV1Payload
  tipo?: ProposicaoTipoFilter
  situacao?: ProposicaoSituacaoFilter
}

export interface ProposicaoAutoradaRow {
  proposicaoId: string
  tipo: string
  numero: number
  ano: number
  ementa: string
  situacao: string
  tipoAutoria: string
}

export interface ProposicoesAutoradasResult {
  rows: ProposicaoAutoradaRow[]
  /** Token base64url do próximo cursor, ou null quando não há mais páginas. */
  nextCursor: string | null
}

// Wave 7 Sprint 7.3 PR3 — refactor de getProposicoesAutoradas para
// cursor pagination (ADR-026) + filtros mini de tipo e situação.
//
// Mudança breaking: assinatura `(parlamentarId, limit?)` → `(parlamentarId,
// opts?)` retornando `{rows, nextCursor}`. Caller único em
// src/app/parlamentares/[id]/page.tsx atualizado no mesmo PR.
//
// ORDER BY (ano DESC, numero DESC, proposicao_id DESC). Keyset pagination
// via WHERE composto (tuple compare em 3 colunas, SQL puro). LIMIT N+1
// para detectar nextCursor.
//
// Filtro `tema` (handoff) NÃO entrou: M:N com proposicao_tema +
// cardinalidade alta (>200 temas distintos) exigiria combobox dedicado.
// Reabrir em ADR futuro se demanda surgir.
export async function getProposicoesAutoradas(
  parlamentarId: string,
  opts: ProposicoesAutoradasOpts = {},
): Promise<ProposicoesAutoradasResult> {
  const cursor = opts.cursor
  const tipo = opts.tipo ?? 'todos'
  const situacao = opts.situacao ?? 'todas'

  const whereClauses = [eq(proposicaoAutor.parlamentarId, parlamentarId)]

  if (tipo !== 'todos') {
    whereClauses.push(sql`${proposicao.tipo}::text = ${tipo}`)
  }
  if (situacao !== 'todas') {
    whereClauses.push(sql`${proposicao.situacao}::text = ${situacao}`)
  }

  // Keyset pagination (ADR-026). Tuple compare em 3 colunas:
  // (ano, numero, id) < (cursor.a, cursor.n, cursor.id).
  if (cursor) {
    whereClauses.push(
      sql`(${proposicao.ano} < ${cursor.a}
        OR (${proposicao.ano} = ${cursor.a} AND ${proposicao.numero} < ${cursor.n})
        OR (${proposicao.ano} = ${cursor.a} AND ${proposicao.numero} = ${cursor.n} AND ${proposicao.id} < ${cursor.id}))`,
    )
  }

  const limitPlusOne = PROPOSICOES_PAGE_SIZE + 1

  const rows = await db
    .select({
      proposicaoId: proposicao.id,
      tipo: proposicao.tipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      situacao: proposicao.situacao,
      tipoAutoria: proposicaoAutor.tipoAutoria,
    })
    .from(proposicaoAutor)
    .innerJoin(proposicao, eq(proposicao.id, proposicaoAutor.proposicaoId))
    .where(and(...whereClauses))
    .orderBy(desc(proposicao.ano), desc(proposicao.numero), desc(proposicao.id))
    .limit(limitPlusOne)

  const hasMore = rows.length > PROPOSICOES_PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, PROPOSICOES_PAGE_SIZE) : rows

  let nextCursor: string | null = null
  if (hasMore) {
    const last = pageRows[pageRows.length - 1]
    if (last) {
      nextCursor = encodeCursor({
        v: 1 as const,
        a: last.ano,
        n: last.numero,
        id: last.proposicaoId,
      })
    }
  }

  return { rows: pageRows as ProposicaoAutoradaRow[], nextCursor }
}

export interface GastoCategoria {
  categoriaDescricao: string
  n: number
  total: string
}

export interface GastosResumo {
  totalGeral: string
  totalRegistros: number
  porCategoria: GastoCategoria[]
}

export async function getGastosResumo(
  parlamentarId: string,
  ano: number,
): Promise<GastosResumo> {
  const rows = await db
    .select({
      categoriaDescricao: gasto.categoriaDescricao,
      n: count(gasto.id),
      total: sum(gasto.valor),
    })
    .from(gasto)
    .where(
      and(
        eq(gasto.parlamentarId, parlamentarId),
        sql`extract(year from ${gasto.dataEmissao}) = ${ano}`,
      ),
    )
    .groupBy(gasto.categoriaDescricao)
    .orderBy(desc(sum(gasto.valor)))

  let totalGeralCents = 0
  let totalRegistros = 0
  const porCategoria: GastoCategoria[] = []
  for (const r of rows) {
    const totalStr = r.total ?? '0'
    // sum() retorna string; somamos em centavos (integer math) para evitar
    // erros de IEEE 754. Total geral cabe folgadamente em Number safe int
    // (R$ 80M/ano da Câmara inteira = ~8e9 centavos << 2^53).
    totalGeralCents += Math.round(Number(totalStr) * 100)
    totalRegistros += r.n
    porCategoria.push({
      categoriaDescricao: r.categoriaDescricao,
      n: r.n,
      total: totalStr,
    })
  }

  const totalGeral = (totalGeralCents / 100).toFixed(2)
  return { totalGeral, totalRegistros, porCategoria }
}

export interface AfinidadeVoto {
  parlamentarId: string
  nome: string
  partidoSigla: string
  uf: string
  casa: string
  urlFoto: string | null
  votosCoincidentes: number
  totalVotosEmComum: number
  /** Percentual entre 0 e 100, arredondado. */
  percentualAfinidade: number
}

// Constantes públicas — referenciadas no copy do componente para manter
// o disclaimer sincronizado com o cálculo.
export const TOP5_QUORUM_MINIMO = 20
export const TOP5_JANELA_MESES = 12

// Top N parlamentares com maior afinidade de voto. Métrica L2 (agregação
// determinística com fórmula publicada): para cada outro parlamentar que
// votou nas mesmas votações nominais que X dentro da janela temporal,
// conta quantos votos coincidem com X. Ordena por percentual desc, com
// total_em_comum como desempate (mais votos coincidentes em base maior
// vence empate). Top 5 final.
//
// Exclui votos AUSENTE em ambos os lados — "ambos ausentes" não é
// concordância política, é apenas não-presença.
//
// Requer quórum mínimo de votações em comum (default 20, recalibrado
// no Sprint 3.0.5 a partir do antigo default de 5) para evitar ruído
// estatístico de pares com pouquíssimas votações em conjunto que
// inflavam percentuais artificialmente para 100%. Distribuição empírica
// (2026-05-13): com quórum 5, 18.4% dos pares atingiam 100%; com 20,
// cai para 5.3%.
//
// Janela temporal (default 12 meses) descarta votações antigas que não
// refletem a configuração atual de bancadas, alianças e contexto.
export async function getTop5Afinidade(
  parlamentarId: string,
  amostraMinima = TOP5_QUORUM_MINIMO,
  janelaMeses = TOP5_JANELA_MESES,
): Promise<AfinidadeVoto[]> {
  const rows = await db.execute(sql`
    WITH votos_em_comum AS (
      SELECT
        vn2.parlamentar_id,
        COUNT(*)::int AS total_em_comum,
        COUNT(*) FILTER (WHERE vn1.voto = vn2.voto)::int AS coincidentes
      FROM votacoes.voto_nominal vn1
      JOIN votacoes.voto_nominal vn2
        ON vn2.votacao_id = vn1.votacao_id
        AND vn2.parlamentar_id <> vn1.parlamentar_id
      INNER JOIN votacoes.votacao v ON v.id = vn1.votacao_id
      WHERE vn1.parlamentar_id = ${parlamentarId}
        AND vn1.voto <> 'AUSENTE'
        AND vn2.voto <> 'AUSENTE'
        AND v.data_hora >= now() - make_interval(months => ${janelaMeses})
      GROUP BY vn2.parlamentar_id
      HAVING COUNT(*) >= ${amostraMinima}
    )
    SELECT
      p.id AS parlamentar_id,
      p.nome,
      p.partido_sigla,
      p.uf,
      p.casa,
      p.url_foto,
      vec.coincidentes,
      vec.total_em_comum
    FROM votos_em_comum vec
    JOIN parlamentares.parlamentar p ON p.id = vec.parlamentar_id
    ORDER BY
      (vec.coincidentes::float / vec.total_em_comum) DESC,
      vec.total_em_comum DESC
    LIMIT 5
  `)

  return rows.rows.map((r) => {
    const coincidentes = Number(r.coincidentes)
    const totalEmComum = Number(r.total_em_comum)
    return {
      parlamentarId: String(r.parlamentar_id),
      nome: String(r.nome),
      partidoSigla: String(r.partido_sigla),
      uf: String(r.uf),
      casa: String(r.casa),
      urlFoto: r.url_foto ? String(r.url_foto) : null,
      votosCoincidentes: coincidentes,
      totalVotosEmComum: totalEmComum,
      percentualAfinidade: Math.round((coincidentes / totalEmComum) * 100),
    }
  })
}

// Catálogos para os autocompletes da listagem. Cacheados (ADR-018,
// princípio 8) com TTL.listagemFiltrada (300s) — mesma cadência da listagem
// e de getListagemStats, que já computa estes mesmos DISTINCTs. No-op em dev.
export async function getPartidosDistintos(): Promise<string[]> {
  return cached(
    'parlamentares:partidos_distintos',
    TTL.listagemFiltrada,
    async () => {
      const rows = await db
        .selectDistinct({ partidoSigla: parlamentar.partidoSigla })
        .from(parlamentar)
        .orderBy(parlamentar.partidoSigla)
      return rows.map((r) => r.partidoSigla)
    },
  )
}

export async function getUfsDistintos(): Promise<string[]> {
  return cached(
    'parlamentares:ufs_distintos',
    TTL.listagemFiltrada,
    async () => {
      const rows = await db
        .selectDistinct({ uf: parlamentar.uf })
        .from(parlamentar)
        .orderBy(parlamentar.uf)
      return rows.map((r) => r.uf)
    },
  )
}

export interface AlinhamentoMensalPoint {
  /** YYYY-MM (ex.: "2026-04"). */
  mes: string
  /** % de alinhamento no mês (0-100, arredondado). null se total = 0. */
  percentual: number | null
  /** Votações comparáveis no mês (exclui AUSENTE e LIBERADO). */
  total: number
}

// Série mensal de alinhamento com a bancada (Wave 7 Sprint 7.0 PR4 — fonte
// de dado para o sparkline em src/components/parlamentar/alinhamento.tsx).
// Aplica os mesmos filtros de src/modules/parlamentares/domain/alinhamento.ts:
// exclui voto AUSENTE e orientacao LIBERADO. Comparação via cast text.
//
// Janela default 12 meses fixa o eixo temporal do sparkline. Meses sem voto
// não aparecem na série — UI lida com lacunas (não preenche com zeros).
export async function getAlinhamentoMensal(
  parlamentarId: string,
  meses = 12,
): Promise<AlinhamentoMensalPoint[]> {
  return cached(
    `parlamentar:alinhamento_mensal:${parlamentarId}:m=${meses}`,
    TTL.alinhamentoPartidario,
    async () => {
      type Row = { mes: string; total: number; alinhados: number }
      const result = await db.execute(sql`
        SELECT
          to_char(${votacao.dataHora}, 'YYYY-MM') AS mes,
          COUNT(*) FILTER (
            WHERE ${votoNominal.voto} != 'AUSENTE'
              AND ob.orientacao != 'LIBERADO'
          )::int AS total,
          COUNT(*) FILTER (
            WHERE ${votoNominal.voto} != 'AUSENTE'
              AND ob.orientacao != 'LIBERADO'
              AND ${votoNominal.voto}::text = ob.orientacao::text
          )::int AS alinhados
        FROM ${votoNominal}
        JOIN ${votacao} ON ${votacao.id} = ${votoNominal.votacaoId}
        JOIN ${parlamentar} ON ${parlamentar.id} = ${votoNominal.parlamentarId}
        JOIN votacoes.orientacao_bancada ob
          ON ob.votacao_id = ${votoNominal.votacaoId}
          AND ob.partido_sigla = ${parlamentar.partidoSigla}
        WHERE ${votoNominal.parlamentarId} = ${parlamentarId}
          AND ${votacao.dataHora} >= now() - (${meses} || ' months')::interval
        GROUP BY 1
        ORDER BY 1
      `)

      // db.execute retorna shape diferente por driver (Neon serverless tem
      // .rows; Neon HTTP retorna array direto). Normaliza ambos.
      const rows = (
        Array.isArray(result)
          ? result
          : ((result as unknown as { rows: Row[] }).rows ?? [])
      ) as Row[]

      return rows
        .filter((r) => r.total > 0)
        .map((r) => ({
          mes: r.mes,
          total: r.total,
          percentual: Math.round((r.alinhados / r.total) * 100),
        }))
    },
  )
}

export interface GastoMensalPoint {
  /** YYYY-MM (ex.: "2026-04"). */
  mes: string
  /** Gasto do parlamentar no mês (BRL, fixed 2). 0 se sem registros. */
  valor: string
  /** Mediana de gasto entre parlamentares da mesma casa nesse mês. 0 se vazio. */
  medianaCasa: string
}

// Série mensal de gasto do parlamentar comparada com a mediana mensal da casa
// (Wave 7 Sprint 7.0 PR4 — fonte do gráfico de linha em /parlamentares/[id]
// Sprint 7.4). Gera 12 meses do ano (Jan-Dez) mesmo quando o parlamentar não
// teve gasto registrado no mês — UI plota linha contínua com zeros.
//
// Mediana é calculada SOBRE os parlamentares com gasto no mês (não inclui
// "0" implícito de quem não gastou) — interpretação editorial: o sinal
// cívico é "entre quem gastou, em que faixa este parlamentar está?".
export async function getGastosMensalMedianaCasa(
  parlamentarId: string,
  ano: number,
): Promise<GastoMensalPoint[]> {
  return cached(
    `parlamentar:gasto_mensal:${parlamentarId}:ano=${ano}`,
    TTL.gastoAnoCorrente,
    async () => {
      type Row = { mes: string; valor: string; mediana_casa: string }
      const result = await db.execute(sql`
        WITH meses AS (
          SELECT to_char(d, 'YYYY-MM') AS mes
          FROM generate_series(
            make_date(${ano}, 1, 1),
            make_date(${ano}, 12, 1),
            interval '1 month'
          ) AS d
        ),
        casa_alvo AS (
          SELECT casa FROM ${parlamentar} WHERE id = ${parlamentarId}
        ),
        gasto_parlamentar_mes AS (
          SELECT
            to_char(${gasto.dataEmissao}, 'YYYY-MM') AS mes,
            SUM(${gasto.valor})::numeric(14, 2) AS valor
          FROM ${gasto}
          WHERE ${gasto.parlamentarId} = ${parlamentarId}
            AND EXTRACT(YEAR FROM ${gasto.dataEmissao}) = ${ano}
          GROUP BY 1
        ),
        gasto_casa_mes AS (
          SELECT
            to_char(g.data_emissao, 'YYYY-MM') AS mes,
            g.parlamentar_id,
            SUM(g.valor) AS valor
          FROM gastos.gasto g
          JOIN ${parlamentar} p ON p.id = g.parlamentar_id
          WHERE p.casa = (SELECT casa FROM casa_alvo)
            AND EXTRACT(YEAR FROM g.data_emissao) = ${ano}
          GROUP BY 1, 2
        ),
        mediana_casa_mes AS (
          SELECT
            mes,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor)::numeric(14, 2) AS mediana
          FROM gasto_casa_mes
          GROUP BY mes
        )
        SELECT
          m.mes,
          COALESCE(gpm.valor, 0)::text AS valor,
          COALESCE(mcm.mediana, 0)::text AS mediana_casa
        FROM meses m
        LEFT JOIN gasto_parlamentar_mes gpm ON gpm.mes = m.mes
        LEFT JOIN mediana_casa_mes mcm ON mcm.mes = m.mes
        ORDER BY m.mes
      `)

      const rows = (
        Array.isArray(result)
          ? result
          : ((result as unknown as { rows: Row[] }).rows ?? [])
      ) as Row[]

      return rows.map((r) => ({
        mes: r.mes,
        valor: r.valor,
        medianaCasa: r.mediana_casa,
      }))
    },
  )
}

export interface FornecedorTop {
  /** CNPJ/CPF do fornecedor, ou string vazia se sem cadastro. */
  cnpj: string
  /** Nome do fornecedor (último registrado quando há variantes). */
  nome: string
  /** Total gasto com o fornecedor no ano (BRL, fixed 2, como string). */
  total: string
  /** Quantidade de registros (notas/recibos) agrupados. */
  registros: number
}

// Top N fornecedores por valor total no ano (Wave 7 Sprint 7.0 PR4 — fonte
// para o "drill-down de gastos" em /parlamentares/[id] Sprint 7.4).
//
// Agrupa por COALESCE(cnpj, nome) — CNPJ é a chave forte; quando ausente
// (gastos antigos da Câmara, gastos do Senado sem cadastro), fallback no
// nome. MAX(nome) escolhe o último registrado quando há variantes.
//
// Limite default 5 alinha com o card "Top 5 fornecedores" da spec
// docs/features/PARLAMENTAR-360.md.
export async function getGastosTopFornecedores(
  parlamentarId: string,
  ano: number,
  limit = 5,
): Promise<FornecedorTop[]> {
  return cached(
    `parlamentar:top_fornecedores:${parlamentarId}:ano=${ano}:lim=${limit}`,
    TTL.gastoAnoCorrente,
    async () => {
      // Agrupamos por COALESCE(cnpj, nome) para tratar como mesma entidade
      // os registros sem CNPJ que compartilham o nome. SELECT usa MAX em
      // ambas as colunas individuais (Postgres exige que não-agrupadas
      // estejam dentro de agregado) — MAX devolve o valor único quando há
      // só um, e o lexicograficamente maior quando há variantes.
      const rows = await db
        .select({
          cnpj: sql<string | null>`MAX(${gasto.fornecedorCnpjCpf})`.as('cnpj'),
          nome: sql<string>`MAX(${gasto.fornecedorNome})`.as('nome'),
          total: sum(gasto.valor),
          registros: count(gasto.id),
        })
        .from(gasto)
        .where(
          and(
            eq(gasto.parlamentarId, parlamentarId),
            sql`EXTRACT(YEAR FROM ${gasto.dataEmissao}) = ${ano}`,
          ),
        )
        .groupBy(
          sql`COALESCE(${gasto.fornecedorCnpjCpf}, ${gasto.fornecedorNome})`,
        )
        .orderBy(desc(sum(gasto.valor)))
        .limit(limit)

      return rows.map((r) => ({
        cnpj: r.cnpj ?? '',
        nome: r.nome,
        total: r.total ?? '0',
        registros: r.registros,
      }))
    },
  )
}

export interface ListagemStats {
  totalParlamentares: number
  totalPartidos: number
  totalUfs: number
}

// Contadores para o hero da listagem (Wave 7 Sprint 7.1 PR1). Stats são
// "geral" — não refletem filtros aplicados (513 parlamentares é a base
// inteira, não os 30 filtrados por casa=SENADO). Cache curto compartilha
// com o restante da listagem (TTL.listagemFiltrada = 300s).
export async function getListagemStats(): Promise<ListagemStats> {
  return cached(
    'parlamentares:listagem_stats',
    TTL.listagemFiltrada,
    async () => {
      const [totalRow, partidos, ufs] = await Promise.all([
        db.select({ n: count(parlamentar.id) }).from(parlamentar),
        db
          .selectDistinct({ partidoSigla: parlamentar.partidoSigla })
          .from(parlamentar),
        db.selectDistinct({ uf: parlamentar.uf }).from(parlamentar),
      ])
      return {
        totalParlamentares: totalRow[0]?.n ?? 0,
        totalPartidos: partidos.length,
        totalUfs: ufs.length,
      }
    },
  )
}

export interface ComparacoesCasa {
  /** Mediana de pct_alinhamento entre todos os parlamentares da mesma casa
   * com agregado computado. Null se ninguém da casa tem amostra. */
  medianaAlinhamentoCasa: number | null
  /** Percentil do parlamentar no proposicoes_count da casa (0-100). Null
   * se o parlamentar não está no agregado. */
  percentilProposicoesCasa: number | null
  /** Percentil já calculado no agregado (Sprint 7.0 PR1). Null quando
   * agregado não tem gasto_total_ano para este parlamentar. */
  percentilGastoCasa: number | null
  /** Contagem total de proposições de autoria (do agregado). Null se o
   * parlamentar não está no agregado. Usado pelo card OG (C1) como fonte
   * cacheada da contagem — evita query não-cacheada no opengraph-image. */
  proposicoesCount: number | null
}

// Comparações intra-casa para hints do KpiStrip v2 (Wave 7 Sprint 7.2 PR1).
// Decisão editorial: usar "casa" (CAMARA/SENADO) como unidade comparativa
// em vez de "partido" — partidos pequenos geram comparações ruidosas
// (n=2 dá percentis triviais). Handoff sugere "p1 do partido" para
// proposições mas optei por consistência com gasto (que já usa casa no
// agregado da Sprint 7.0 PR1).
//
// 1 query agregada com CTEs lê estatistica_parlamentar_agregada já
// populado — sem JOIN com voto_nominal/gasto/etc. Cache curto compartilha
// com perfil (TTL.parlamentarPerfil = 3600s).
export async function getComparacoesCasa(
  parlamentarId: string,
): Promise<ComparacoesCasa> {
  return cached(
    `parlamentar:comparacoes_casa:${parlamentarId}`,
    TTL.parlamentarPerfil,
    async () => {
      type Row = {
        mediana_alinhamento: string | null
        percentil_proposicoes: string | null
        percentil_gasto: string | null
        proposicoes_count: string | null
      }
      const result = await db.execute(sql`
        WITH alvo AS (
          SELECT
            p.casa,
            e.percentil_gasto_casa,
            e.proposicoes_count
          FROM parlamentares.parlamentar p
          LEFT JOIN parlamentares.estatistica_parlamentar_agregada e
            ON e.parlamentar_id = p.id
          WHERE p.id = ${parlamentarId}
        ),
        mediana_alinhamento_casa AS (
          SELECT
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.pct_alinhamento)::numeric(5, 2) AS mediana
          FROM parlamentares.parlamentar p
          JOIN parlamentares.estatistica_parlamentar_agregada e
            ON e.parlamentar_id = p.id
          WHERE p.casa = (SELECT casa FROM alvo)
            AND e.pct_alinhamento IS NOT NULL
        ),
        percentil_propos_casa AS (
          SELECT
            (PERCENT_RANK() OVER (ORDER BY e.proposicoes_count) * 100)::numeric(5, 2) AS percentil,
            p.id
          FROM parlamentares.parlamentar p
          JOIN parlamentares.estatistica_parlamentar_agregada e
            ON e.parlamentar_id = p.id
          WHERE p.casa = (SELECT casa FROM alvo)
        )
        SELECT
          mac.mediana::text AS mediana_alinhamento,
          ppc.percentil::text AS percentil_proposicoes,
          a.percentil_gasto_casa::text AS percentil_gasto,
          a.proposicoes_count::text AS proposicoes_count
        FROM alvo a
        LEFT JOIN mediana_alinhamento_casa mac ON TRUE
        LEFT JOIN percentil_propos_casa ppc ON ppc.id = ${parlamentarId}
      `)

      const rows = (
        Array.isArray(result)
          ? result
          : ((result as unknown as { rows: Row[] }).rows ?? [])
      ) as Row[]
      const row = rows[0]
      if (!row) {
        return {
          medianaAlinhamentoCasa: null,
          percentilProposicoesCasa: null,
          percentilGastoCasa: null,
          proposicoesCount: null,
        }
      }
      return {
        medianaAlinhamentoCasa:
          row.mediana_alinhamento == null
            ? null
            : Number(row.mediana_alinhamento),
        percentilProposicoesCasa:
          row.percentil_proposicoes == null
            ? null
            : Number(row.percentil_proposicoes),
        percentilGastoCasa:
          row.percentil_gasto == null ? null : Number(row.percentil_gasto),
        proposicoesCount:
          row.proposicoes_count == null ? null : Number(row.proposicoes_count),
      }
    },
  )
}

export interface VotosDistribuicao {
  sim: number
  nao: number
  abstencao: number
  ausente: number
  obstrucao: number
  /** Soma dos 5 acima — base do cálculo de percentual no UI. */
  total: number
}

// Distribuição de votos por tipo (Wave 7 Sprint 7.3 PR2 — barra CSS-only
// no header da SectionCard "Votos recentes"). Aplica os mesmos filtros
// que getVotosRecentes (periodo + alinhamento) para refletir o subconjunto
// que o usuário está vendo.
//
// AUSENTE e OBSTRUCAO entram na resposta mas o consumer (componente UI)
// renderiza só SIM/NAO/ABSTENCAO na barra — handoff lista 3 categorias.
// Caller pode usar os campos extras se quiser uma vista mais granular
// no futuro.
export async function getVotosDistribuicao(
  parlamentarId: string,
  opts: Pick<VotosRecentesOpts, 'periodo' | 'alinhamento'> = {},
): Promise<VotosDistribuicao> {
  const periodo = opts.periodo ?? 'all'
  const alinhamento = opts.alinhamento ?? 'todos'

  const whereClauses = [eq(votoNominal.parlamentarId, parlamentarId)]
  if (periodo !== 'all') {
    const interval =
      periodo === '30d'
        ? '30 days'
        : periodo === '90d'
          ? '90 days'
          : '12 months'
    whereClauses.push(sql`${votacao.dataHora} >= now() - ${interval}::interval`)
  }
  if (alinhamento === 'alinhado') {
    whereClauses.push(
      sql`${votoNominal.voto} != 'AUSENTE' AND orientacao_bancada.orientacao != 'LIBERADO' AND ${votoNominal.voto}::text = orientacao_bancada.orientacao::text`,
    )
  } else if (alinhamento === 'divergente') {
    whereClauses.push(
      sql`${votoNominal.voto} != 'AUSENTE' AND orientacao_bancada.orientacao != 'LIBERADO' AND ${votoNominal.voto}::text != orientacao_bancada.orientacao::text`,
    )
  }

  const rows = await db
    .select({
      voto: votoNominal.voto,
      n: count(votoNominal.id),
    })
    .from(votoNominal)
    .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
    .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
    .leftJoin(
      sql`votacoes.orientacao_bancada`,
      sql`orientacao_bancada.votacao_id = ${votoNominal.votacaoId} AND orientacao_bancada.partido_sigla = ${parlamentar.partidoSigla}`,
    )
    .where(and(...whereClauses))
    .groupBy(votoNominal.voto)

  const acc: VotosDistribuicao = {
    sim: 0,
    nao: 0,
    abstencao: 0,
    ausente: 0,
    obstrucao: 0,
    total: 0,
  }
  for (const r of rows) {
    switch (r.voto) {
      case 'SIM':
        acc.sim = r.n
        break
      case 'NAO':
        acc.nao = r.n
        break
      case 'ABSTENCAO':
        acc.abstencao = r.n
        break
      case 'AUSENTE':
        acc.ausente = r.n
        break
      case 'OBSTRUCAO':
        acc.obstrucao = r.n
        break
    }
    acc.total += r.n
  }
  return acc
}

/** Page-size fixo (ADR-026 §3) para drill-down de gastos. */
export const GASTOS_PAGE_SIZE = 20

/** Trimestres do ano civil (Wave 7 Sprint 7.4 PR4 — filtro mini). */
export type GastosTrimestreFilter = 'todo' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

export const GASTOS_TRIMESTRES: GastosTrimestreFilter[] = [
  'todo',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
]

const TRIMESTRE_MESES: Record<
  Exclude<GastosTrimestreFilter, 'todo'>,
  [number, number]
> = {
  Q1: [1, 3],
  Q2: [4, 6],
  Q3: [7, 9],
  Q4: [10, 12],
}

export interface GastosDetalheOpts {
  cursor?: CursorGastosV1Payload
  /** Filtro de trimestre dentro do ano. */
  trimestre?: GastosTrimestreFilter
  /** Filtro por categoria_descricao (string exata). */
  categoria?: string
}

export interface GastoDetalheRow {
  gastoId: string
  dataEmissao: Date | string
  categoriaDescricao: string
  fornecedorNome: string
  fornecedorCnpjCpf: string | null
  valor: string
  urlDocumento: string | null
}

export interface GastosDetalheResult {
  rows: GastoDetalheRow[]
  /** Token base64url do próximo cursor, ou null quando não há mais. */
  nextCursor: string | null
}

// Drill-down paginado de gastos CEAP do parlamentar em um ano específico
// (Wave 7 Sprint 7.4 PR3 — consumer real em /parlamentares/[id]/gastos).
//
// ORDER BY (data_emissao DESC, gasto_id DESC). Keyset pagination via
// WHERE composto (Postgres não tem tuple compare direto via drizzle).
// LIMIT N+1 → detectar nextCursor sem COUNT.
export async function getGastosDetalhe(
  parlamentarId: string,
  ano: number,
  opts: GastosDetalheOpts = {},
): Promise<GastosDetalheResult> {
  const cursor = opts.cursor
  const trimestre = opts.trimestre ?? 'todo'
  const categoria = opts.categoria?.trim() || undefined

  const whereClauses = [
    eq(gasto.parlamentarId, parlamentarId),
    sql`EXTRACT(YEAR FROM ${gasto.dataEmissao}) = ${ano}`,
  ]
  if (trimestre !== 'todo') {
    const [from, to] = TRIMESTRE_MESES[trimestre]
    whereClauses.push(
      sql`EXTRACT(MONTH FROM ${gasto.dataEmissao}) BETWEEN ${from} AND ${to}`,
    )
  }
  if (categoria) {
    whereClauses.push(eq(gasto.categoriaDescricao, categoria))
  }
  if (cursor) {
    // data_emissao é DATE; comparamos como timestamp via cast implícito.
    const cursorDate = new Date(cursor.d).toISOString().slice(0, 10)
    whereClauses.push(
      sql`(${gasto.dataEmissao} < ${cursorDate}::date OR (${gasto.dataEmissao} = ${cursorDate}::date AND ${gasto.id} < ${cursor.id}))`,
    )
  }

  const limitPlusOne = GASTOS_PAGE_SIZE + 1

  const rows = await db
    .select({
      gastoId: gasto.id,
      dataEmissao: gasto.dataEmissao,
      categoriaDescricao: gasto.categoriaDescricao,
      fornecedorNome: gasto.fornecedorNome,
      fornecedorCnpjCpf: gasto.fornecedorCnpjCpf,
      valor: gasto.valor,
      urlDocumento: gasto.urlDocumento,
    })
    .from(gasto)
    .where(and(...whereClauses))
    .orderBy(desc(gasto.dataEmissao), desc(gasto.id))
    .limit(limitPlusOne)

  const hasMore = rows.length > GASTOS_PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, GASTOS_PAGE_SIZE) : rows

  let nextCursor: string | null = null
  if (hasMore) {
    const last = pageRows[pageRows.length - 1]
    if (last) {
      // data_emissao vem como string YYYY-MM-DD (drizzle DATE → string).
      // Converte para epoch ms via UTC midnight para empacotar no token.
      const isoDate = String(last.dataEmissao).slice(0, 10)
      const dt = new Date(`${isoDate}T00:00:00Z`)
      nextCursor = encodeCursor({
        v: 1 as const,
        d: dt.getTime(),
        id: last.gastoId,
      })
    }
  }

  return { rows: pageRows as GastoDetalheRow[], nextCursor }
}

// Lista distinta de categorias presentes nos gastos do parlamentar no ano
// (Wave 7 Sprint 7.4 PR4 — popula o dropdown de filtro na rota
// /parlamentares/[id]/gastos). Ordem alfabética pra UI determinística.
export async function getGastosCategoriasDistintas(
  parlamentarId: string,
  ano: number,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ categoria: gasto.categoriaDescricao })
    .from(gasto)
    .where(
      and(
        eq(gasto.parlamentarId, parlamentarId),
        sql`EXTRACT(YEAR FROM ${gasto.dataEmissao}) = ${ano}`,
      ),
    )
    .orderBy(gasto.categoriaDescricao)
  return rows.map((r) => r.categoria)
}
