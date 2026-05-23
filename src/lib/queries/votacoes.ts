import { and, asc, count, desc, eq, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { encodeCursor } from '@/lib/cursor'
import type { CursorVotacoesV1Payload } from '@/lib/queries/cursor-schemas'
import type {
  OrientacaoBancada,
  TipoVoto as TipoVotoDomain,
} from '@/modules/votacoes/domain/disciplina'
import { db } from '@/shared/db'
import {
  orientacao,
  parlamentar,
  proposicao,
  votacao,
  votoNominal,
} from '@/shared/db/schema'

// Page size da listagem com cursor (ADR-028 §1). Divisível por 2/3/4/6
// para harmonizar grids em qualquer breakpoint.
export const VOTACOES_LISTAGEM_PAGE_SIZE = 24

export type Casa = 'CAMARA' | 'SENADO'

export type TipoVoto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

export const TIPOS_VOTO: readonly TipoVoto[] = [
  'SIM',
  'NAO',
  'ABSTENCAO',
  'AUSENTE',
  'OBSTRUCAO',
] as const

export interface FiltrosVotacao {
  casa?: Casa
  ano?: number
  /** "todas" | "aprovadas" | "rejeitadas" */
  resultado?: 'aprovadas' | 'rejeitadas'
  /** Apenas votações com pelo menos 1 voto nominal registrado. */
  somenteNominais?: boolean
}

export async function listVotacoes(filtros: FiltrosVotacao = {}, limit = 50) {
  const key = `votacoes:list:casa=${filtros.casa ?? '_'}:ano=${filtros.ano ?? '_'}:resultado=${filtros.resultado ?? '_'}:nominais=${filtros.somenteNominais ? '1' : '0'}:limit=${limit}`
  return cached(key, TTL.listagemFiltrada, async () => {
    const where = []
    if (filtros.casa) where.push(eq(votacao.casa, filtros.casa))
    if (filtros.ano) {
      where.push(sql`extract(year from ${votacao.dataHora}) = ${filtros.ano}`)
    }
    if (filtros.resultado === 'aprovadas')
      where.push(eq(votacao.aprovada, true))
    if (filtros.resultado === 'rejeitadas')
      where.push(eq(votacao.aprovada, false))
    if (filtros.somenteNominais) {
      where.push(
        sql`exists (select 1 from votacoes.voto_nominal vn where vn.votacao_id = ${votacao.id})`,
      )
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
        abstencoes: votacao.abstencoes,
        sourceUrl: votacao.sourceUrl,
      })
      .from(votacao)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(desc(votacao.dataHora))
      .limit(limit)
  })
}

export async function getVotacaoById(id: string) {
  return cached(`votacoes:byid:${id}`, TTL.votacaoHistorica, async () => {
    const rows = await db
      .select({
        id: votacao.id,
        casa: votacao.casa,
        proposicaoId: votacao.proposicaoId,
        dataHora: votacao.dataHora,
        descricao: votacao.descricao,
        orgao: votacao.orgao,
        votosSim: votacao.votosSim,
        votosNao: votacao.votosNao,
        abstencoes: votacao.abstencoes,
        ausentes: votacao.ausentes,
        aprovada: votacao.aprovada,
        trustLevel: votacao.trustLevel,
        sourceUrl: votacao.sourceUrl,
      })
      .from(votacao)
      .where(eq(votacao.id, id))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function getProposicaoVinculada(proposicaoId: string | null) {
  if (!proposicaoId) return null
  return cached(
    `votacoes:proposicao-vinculada:${proposicaoId}`,
    TTL.votacaoHistorica,
    async () => {
      const rows = await db
        .select({
          id: proposicao.id,
          tipo: proposicao.tipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
          situacao: proposicao.situacao,
        })
        .from(proposicao)
        .where(eq(proposicao.id, proposicaoId))
        .limit(1)
      return rows[0] ?? null
    },
  )
}

export interface VotoIndividual {
  id: string
  voto: string
  parlamentarId: string
  parlamentarNome: string
  parlamentarPartidoSigla: string
  parlamentarUf: string
}

// Lista de votos individuais de uma votação. Quando `filtros.voto` é
// passado, query roda direto sem cache (path raro, deprecated após
// Sprint 9.2 quando filtro migra para client-side — D7). Caso sem
// filtro é o único cacheável: lista completa de 1 votação cabe num
// payload pequeno e cresce zero após fechamento da sessão.
export async function getVotosByVotacao(
  votacaoId: string,
  filtros: { voto?: TipoVoto } = {},
): Promise<VotoIndividual[]> {
  const loader = async () => {
    const where = [eq(votoNominal.votacaoId, votacaoId)]
    if (filtros.voto) where.push(eq(votoNominal.voto, filtros.voto))

    return db
      .select({
        id: votoNominal.id,
        voto: votoNominal.voto,
        parlamentarId: parlamentar.id,
        parlamentarNome: parlamentar.nome,
        parlamentarPartidoSigla: parlamentar.partidoSigla,
        parlamentarUf: parlamentar.uf,
      })
      .from(votoNominal)
      .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
      .where(and(...where))
      .orderBy(asc(parlamentar.partidoSigla), asc(parlamentar.nome))
  }

  if (filtros.voto) return loader()
  return cached(`votacoes:votos:${votacaoId}`, TTL.votacaoHistorica, loader)
}

export interface ResumoPorPartido {
  partidoSigla: string
  sim: number
  nao: number
  abstencao: number
  ausente: number
  obstrucao: number
  total: number
}

// Agregação por partido — útil quando o usuário quer ver como cada partido
// se posicionou sem ler 500 nomes individualmente.
export async function getVotosResumoPorPartido(
  votacaoId: string,
): Promise<ResumoPorPartido[]> {
  return cached(
    `votacoes:resumo-partido:${votacaoId}`,
    TTL.votacaoHistorica,
    async () => {
      const rows = await db
        .select({
          partidoSigla: parlamentar.partidoSigla,
          voto: votoNominal.voto,
          n: count(votoNominal.id),
        })
        .from(votoNominal)
        .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
        .where(eq(votoNominal.votacaoId, votacaoId))
        .groupBy(parlamentar.partidoSigla, votoNominal.voto)

      const mapa = new Map<string, ResumoPorPartido>()
      for (const r of rows) {
        const existing = mapa.get(r.partidoSigla) ?? {
          partidoSigla: r.partidoSigla,
          sim: 0,
          nao: 0,
          abstencao: 0,
          ausente: 0,
          obstrucao: 0,
          total: 0,
        }
        if (r.voto === 'SIM') existing.sim = r.n
        else if (r.voto === 'NAO') existing.nao = r.n
        else if (r.voto === 'ABSTENCAO') existing.abstencao = r.n
        else if (r.voto === 'AUSENTE') existing.ausente = r.n
        else if (r.voto === 'OBSTRUCAO') existing.obstrucao = r.n
        existing.total += r.n
        mapa.set(r.partidoSigla, existing)
      }
      return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
    },
  )
}

// Counter para honestidade de truncagem no export CSV (Sprint 3.0). Mesmas
// cláusulas WHERE de `listVotacoes` — manter sincronizado quando filtros
// mudarem. Cacheado com o mesmo TTL da listagem para alinhar invalidação.
export async function countVotacoes(
  filtros: FiltrosVotacao = {},
): Promise<number> {
  const key = `votacoes:count:casa=${filtros.casa ?? '_'}:ano=${filtros.ano ?? '_'}:resultado=${filtros.resultado ?? '_'}:nominais=${filtros.somenteNominais ? '1' : '0'}`
  return cached(key, TTL.listagemFiltrada, async () => {
    const where = []
    if (filtros.casa) where.push(eq(votacao.casa, filtros.casa))
    if (filtros.ano) {
      where.push(sql`extract(year from ${votacao.dataHora}) = ${filtros.ano}`)
    }
    if (filtros.resultado === 'aprovadas')
      where.push(eq(votacao.aprovada, true))
    if (filtros.resultado === 'rejeitadas')
      where.push(eq(votacao.aprovada, false))
    if (filtros.somenteNominais) {
      where.push(
        sql`exists (select 1 from votacoes.voto_nominal vn where vn.votacao_id = ${votacao.id})`,
      )
    }

    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(votacao)
      .where(where.length > 0 ? and(...where) : undefined)
    return rows[0]?.total ?? 0
  })
}

export async function getAnosVotacaoDistintos(): Promise<number[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT extract(year from ${votacao.dataHora})::int AS ano
    FROM ${votacao}
    ORDER BY ano DESC
  `)
  return rows.rows.map((r) => Number(r.ano))
}

export interface VotacaoRecente {
  id: string
  casa: Casa
  dataHora: Date | string
  descricao: string
  aprovada: boolean
}

// Votações mais recentes para o card narrativo da home (Sprint 3.1 Tarefa 2).
// Filtra por janela temporal — caller decide quantos dias e quantos itens.
// Cache via `cached()` — home é `force-dynamic` (ver `src/app/page.tsx`
// comentário sobre R2 incremental cache pendente / issue #58); até lá esta
// função é a única camada de cache entre a home e o Neon.
export async function getVotacoesRecentes(
  diasJanela: number,
  limit: number,
): Promise<VotacaoRecente[]> {
  const key = `votacoes:recentes:dias=${diasJanela}:limit=${limit}`
  return cached(key, TTL.votacaoRecente, async () => {
    return db
      .select({
        id: votacao.id,
        casa: votacao.casa,
        dataHora: votacao.dataHora,
        descricao: votacao.descricao,
        aprovada: votacao.aprovada,
      })
      .from(votacao)
      .where(
        sql`${votacao.dataHora} >= now() - make_interval(days => ${diasJanela})`,
      )
      .orderBy(desc(votacao.dataHora))
      .limit(limit)
  })
}

export interface VotacaoListaItem {
  id: string
  sourceId: string
  casa: Casa
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
  votosSim: number
  votosNao: number
  abstencoes: number
  sourceUrl: string
}

export interface ListVotacoesOpts {
  /** Cursor versionado v1 (ADR-026 + ADR-028). Quando undefined, primeira página. */
  cursor?: CursorVotacoesV1Payload
  /** Override do page size. Default VOTACOES_LISTAGEM_PAGE_SIZE (24). */
  limit?: number
}

export interface ListVotacoesCursorResult {
  rows: VotacaoListaItem[]
  /** Token base64url do próximo cursor, ou null quando não há mais páginas. */
  nextCursor: string | null
}

// Listagem com cursor opaco versionado v1 (ADR-026 + ADR-028).
// ORDER BY: votacao.data_hora DESC, votacao.id DESC (tiebreaker estável).
// Keyset compare via tuple: (dataHora, id) < (cursor.d, cursor.id).
// N+1 trick para detectar hasMore + gerar nextCursor.
// Cache: TTL.listagemFiltrada (5min). Key inclui filtros + cursor.
export async function listVotacoesCursor(
  filtros: FiltrosVotacao = {},
  opts: ListVotacoesOpts = {},
): Promise<ListVotacoesCursorResult> {
  const limit = opts.limit ?? VOTACOES_LISTAGEM_PAGE_SIZE
  const cursorPart = opts.cursor ? encodeCursor(opts.cursor) : 'p1'
  const key = `votacoes:listcursor:casa=${filtros.casa ?? '_'}:ano=${filtros.ano ?? '_'}:resultado=${filtros.resultado ?? '_'}:nominais=${filtros.somenteNominais ? '1' : '0'}:limit=${limit}:cursor=${cursorPart}`

  return cached(key, TTL.listagemFiltrada, async () => {
    const where = []
    if (filtros.casa) where.push(eq(votacao.casa, filtros.casa))
    if (filtros.ano) {
      where.push(sql`extract(year from ${votacao.dataHora}) = ${filtros.ano}`)
    }
    if (filtros.resultado === 'aprovadas')
      where.push(eq(votacao.aprovada, true))
    if (filtros.resultado === 'rejeitadas')
      where.push(eq(votacao.aprovada, false))
    if (filtros.somenteNominais) {
      where.push(
        sql`exists (select 1 from votacoes.voto_nominal vn where vn.votacao_id = ${votacao.id})`,
      )
    }

    if (opts.cursor) {
      const c = opts.cursor
      const cursorDate = new Date(c.d)
      where.push(
        sql`(${votacao.dataHora} < ${cursorDate}
          OR (${votacao.dataHora} = ${cursorDate} AND ${votacao.id} < ${c.id}))`,
      )
    }

    const limitPlusOne = limit + 1
    const rows = await db
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
        abstencoes: votacao.abstencoes,
        sourceUrl: votacao.sourceUrl,
      })
      .from(votacao)
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(desc(votacao.dataHora), desc(votacao.id))
      .limit(limitPlusOne)

    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    let nextCursor: string | null = null
    if (hasMore) {
      const last = pageRows[pageRows.length - 1]
      if (last) {
        const dEpoch =
          typeof last.dataHora === 'string'
            ? new Date(last.dataHora).getTime()
            : last.dataHora.getTime()
        nextCursor = encodeCursor({
          v: 1 as const,
          d: dEpoch,
          id: last.id,
        })
      }
    }
    return { rows: pageRows as VotacaoListaItem[], nextCursor }
  })
}

// =============================================================================
// Wave 9 — queries de disciplina partidária e relacionadas (ADR-028)
//
// Todas cacheadas com TTL.votacaoHistorica (7 dias). Votações fechadas são
// imutáveis no modelo de domínio (princípio 3 do CLAUDE.md), e o ADR-028
// cravou essas chamadas como elegíveis para cache longo.
// =============================================================================

export interface OrientacaoPartido {
  partidoSigla: string
  orientacao: OrientacaoBancada
}

// Orientações de bancada para uma votação. Quando a tabela está vazia, a
// votação não teve orientações registradas (votação simbólica, antiga, ou
// quando o partido liberou bancada e isso não foi gravado). Caller decide
// se renderiza seção condicional ou mostra empty state.
export async function getOrientacoesByVotacao(
  votacaoId: string,
): Promise<OrientacaoPartido[]> {
  const key = `votacoes:orientacoes:${votacaoId}`
  return cached(key, TTL.votacaoHistorica, async () => {
    const rows = await db
      .select({
        partidoSigla: orientacao.partidoSigla,
        orientacao: orientacao.orientacao,
      })
      .from(orientacao)
      .where(eq(orientacao.votacaoId, votacaoId))
      .orderBy(asc(orientacao.partidoSigla))
    return rows.map((r) => ({
      partidoSigla: r.partidoSigla,
      orientacao: r.orientacao as OrientacaoBancada,
    }))
  })
}

export interface DisciplinaPartidoRow {
  partido: string
  orientacao: OrientacaoBancada
  seguiram: number
  rebelaram: number
  totalAtivo: number
  pctDisciplina: number
}

// Disciplina partidária: para cada partido com orientação efetiva
// (SIM/NAO/OBSTRUCAO; LIBERADO excluído), conta quantos parlamentares
// seguiram a orientação vs. rebelaram.
//
// Denominador (totalAtivo) ignora AUSENTE e ABSTENCAO — só conta voto
// "ativo" (SIM, NAO, OBSTRUCAO), espelhando a semântica de
// `calcularDisciplinaPartido` em `domain/disciplina.ts`.
//
// SQL gera os agregados direto no Postgres (1 round-trip). Partidos sem
// nenhum voto ativo são filtrados via HAVING — denominador zero é sinal
// de "sem informação", não 100%.
export async function getDisciplinaPartidariaPorVotacao(
  votacaoId: string,
): Promise<DisciplinaPartidoRow[]> {
  const key = `votacoes:disciplina:${votacaoId}`
  return cached(key, TTL.votacaoHistorica, async () => {
    const result = await db.execute(sql`
      SELECT
        ob.partido_sigla AS partido,
        ob.orientacao::text AS orientacao,
        SUM(CASE WHEN vn.voto::text IN ('SIM','NAO','OBSTRUCAO') THEN 1 ELSE 0 END)::int AS total_ativo,
        SUM(CASE WHEN vn.voto::text = ob.orientacao::text THEN 1 ELSE 0 END)::int AS seguiram
      FROM votacoes.orientacao_bancada ob
      JOIN parlamentares.parlamentar p ON p.partido_sigla = ob.partido_sigla
      JOIN votacoes.voto_nominal vn ON vn.parlamentar_id = p.id AND vn.votacao_id = ob.votacao_id
      WHERE ob.votacao_id = ${votacaoId}
        AND ob.orientacao::text IN ('SIM','NAO','OBSTRUCAO')
      GROUP BY ob.partido_sigla, ob.orientacao
      HAVING SUM(CASE WHEN vn.voto::text IN ('SIM','NAO','OBSTRUCAO') THEN 1 ELSE 0 END) > 0
      ORDER BY total_ativo DESC, ob.partido_sigla ASC
    `)

    return result.rows.map((r) => {
      const seguiram = Number(r.seguiram)
      const totalAtivo = Number(r.total_ativo)
      return {
        partido: String(r.partido),
        orientacao: r.orientacao as OrientacaoBancada,
        seguiram,
        rebelaram: totalAtivo - seguiram,
        totalAtivo,
        pctDisciplina: (seguiram / totalAtivo) * 100,
      }
    })
  })
}

export interface RebeldeRow {
  parlamentarId: string
  nome: string
  partidoSigla: string
  uf: string
  votou: TipoVotoDomain
  orientacao: OrientacaoBancada
}

// Rebeldes: parlamentares que votaram diferente da orientação do próprio
// partido. Critério: orientação efetiva (SIM/NAO/OBSTRUCAO) + voto ativo
// (SIM/NAO/OBSTRUCAO) divergente. AUSENTE/ABSTENCAO não caracterizam
// rebeldia — mesma semântica de `isRebelde` em `domain/disciplina.ts`.
export async function getRebeldesByVotacao(
  votacaoId: string,
): Promise<RebeldeRow[]> {
  const key = `votacoes:rebeldes:${votacaoId}`
  return cached(key, TTL.votacaoHistorica, async () => {
    const result = await db.execute(sql`
      SELECT
        p.id AS parlamentar_id,
        p.nome,
        p.partido_sigla,
        p.uf,
        vn.voto::text AS votou,
        ob.orientacao::text AS orientacao
      FROM votacoes.orientacao_bancada ob
      JOIN parlamentares.parlamentar p ON p.partido_sigla = ob.partido_sigla
      JOIN votacoes.voto_nominal vn ON vn.parlamentar_id = p.id AND vn.votacao_id = ob.votacao_id
      WHERE ob.votacao_id = ${votacaoId}
        AND ob.orientacao::text IN ('SIM','NAO','OBSTRUCAO')
        AND vn.voto::text IN ('SIM','NAO','OBSTRUCAO')
        AND vn.voto::text != ob.orientacao::text
      ORDER BY p.partido_sigla ASC, p.nome ASC
    `)

    return result.rows.map((r) => ({
      parlamentarId: String(r.parlamentar_id),
      nome: String(r.nome),
      partidoSigla: String(r.partido_sigla),
      uf: String(r.uf),
      votou: r.votou as TipoVotoDomain,
      orientacao: r.orientacao as OrientacaoBancada,
    }))
  })
}

export type RelacaoVotacao = 'mesma_proposicao' | 'mesmo_orgao_janela'

export interface VotacaoRelacionada {
  id: string
  casa: Casa
  dataHora: Date | string
  descricao: string
  aprovada: boolean
  relacao: RelacaoVotacao
}

// Cross-links contextuais. Prioriza "mesma_proposicao" (mais relevante),
// completa com "mesmo_orgao_janela" (±30 dias). Dedup garantido por
// `id != votacaoId` na origem + filter no merge.
export async function getVotacoesRelacionadas(
  votacaoId: string,
  limit = 4,
): Promise<VotacaoRelacionada[]> {
  const key = `votacoes:relacionadas:${votacaoId}:limit=${limit}`
  return cached(key, TTL.votacaoHistorica, async () => {
    const baseRows = await db
      .select({
        proposicaoId: votacao.proposicaoId,
        orgao: votacao.orgao,
        dataHora: votacao.dataHora,
      })
      .from(votacao)
      .where(eq(votacao.id, votacaoId))
      .limit(1)
    const base = baseRows[0]
    if (!base) return []

    const projection = {
      id: votacao.id,
      casa: votacao.casa,
      dataHora: votacao.dataHora,
      descricao: votacao.descricao,
      aprovada: votacao.aprovada,
    }

    const mesmaProposicaoPromise = base.proposicaoId
      ? db
          .select(projection)
          .from(votacao)
          .where(
            and(
              eq(votacao.proposicaoId, base.proposicaoId),
              sql`${votacao.id} != ${votacaoId}`,
            ),
          )
          .orderBy(desc(votacao.dataHora))
          .limit(limit)
      : Promise.resolve([])

    const mesmoOrgaoPromise = db
      .select(projection)
      .from(votacao)
      .where(
        and(
          eq(votacao.orgao, base.orgao),
          sql`${votacao.id} != ${votacaoId}`,
          sql`${votacao.dataHora} BETWEEN ${base.dataHora}::timestamptz - interval '30 days' AND ${base.dataHora}::timestamptz + interval '30 days'`,
        ),
      )
      .orderBy(desc(votacao.dataHora))
      .limit(limit * 2)

    const [mesmaProposicao, mesmoOrgao] = await Promise.all([
      mesmaProposicaoPromise,
      mesmoOrgaoPromise,
    ])

    const idsJaIncluidos = new Set(mesmaProposicao.map((r) => r.id))
    const mesmaProposicaoMarked: VotacaoRelacionada[] = mesmaProposicao.map(
      (r) => ({
        id: r.id,
        casa: r.casa as Casa,
        dataHora: r.dataHora,
        descricao: r.descricao,
        aprovada: r.aprovada,
        relacao: 'mesma_proposicao',
      }),
    )
    const mesmoOrgaoFiltered: VotacaoRelacionada[] = mesmoOrgao
      .filter((r) => !idsJaIncluidos.has(r.id))
      .map((r) => ({
        id: r.id,
        casa: r.casa as Casa,
        dataHora: r.dataHora,
        descricao: r.descricao,
        aprovada: r.aprovada,
        relacao: 'mesmo_orgao_janela',
      }))

    return [...mesmaProposicaoMarked, ...mesmoOrgaoFiltered].slice(0, limit)
  })
}
