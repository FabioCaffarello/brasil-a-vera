import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
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
  /** Busca livre: dígitos puros → match exato em numero; texto → ILIKE em ementa. */
  q?: string
  /** Ordem de exibição; default 'recente'. */
  ordem?: OrdemProposicao
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

export async function listProposicoes(
  filtros: FiltrosProposicao = {},
  limit = 50,
) {
  const where = []
  if (filtros.tipo) where.push(eq(proposicao.tipo, filtros.tipo))
  if (filtros.ano) where.push(eq(proposicao.ano, filtros.ano))
  if (filtros.situacao) where.push(eq(proposicao.situacao, filtros.situacao))
  const qClause = whereForQ(filtros.q)
  if (qClause) where.push(qClause)

  const ordem = filtros.ordem ?? 'recente'
  const baseSelect = {
    id: proposicao.id,
    tipo: proposicao.tipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    situacao: proposicao.situacao,
    sourceUrl: proposicao.sourceUrl,
  }

  // Ordens 'movimentada' e 'parada' exigem dias_desde_ultima_tramitacao da
  // tabela agregada. LEFT JOIN: proposições sem linha agregada (seed ainda
  // não rodou ou row órfã) ficam com NULL — caem para o fim via NULLS LAST.
  if (ordem === 'movimentada' || ordem === 'parada') {
    const orderExpr =
      ordem === 'movimentada'
        ? sql`${estatisticaProposicaoAgregada.diasDesdeUltimaTramitacao} ASC NULLS LAST`
        : sql`${estatisticaProposicaoAgregada.diasDesdeUltimaTramitacao} DESC NULLS LAST`
    return db
      .select(baseSelect)
      .from(proposicao)
      .leftJoin(
        estatisticaProposicaoAgregada,
        eq(estatisticaProposicaoAgregada.proposicaoId, proposicao.id),
      )
      .where(where.length > 0 ? and(...where) : undefined)
      .orderBy(orderExpr, desc(proposicao.ano), desc(proposicao.numero))
      .limit(limit)
  }

  const ordenacao =
    ordem === 'antiga'
      ? [asc(proposicao.ano), asc(proposicao.numero)]
      : [desc(proposicao.ano), desc(proposicao.numero)]

  return db
    .select(baseSelect)
    .from(proposicao)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(...ordenacao)
    .limit(limit)
}

export async function getProposicaoByChave(
  tipo: TipoProposicao,
  numero: number,
  ano: number,
) {
  const rows = await db
    .select()
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

export async function getVotacoesByProposicao(proposicaoId: string) {
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
    .where(eq(votacao.proposicaoId, proposicaoId))
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

// Timeline da proposição: eventos ordenados do mais recente pro mais antigo,
// que é a ordem natural pra exibir num feed. Cacheado com TTL longo (ADR-018)
// — tramitação muda no máximo algumas vezes por semana, dominado pelo cron.
export async function getTramitacaoByProposicao(
  proposicaoId: string,
): Promise<TramitacaoEvento[]> {
  return cached(
    `proposicao:tramitacao:${proposicaoId}`,
    TTL.proposicaoEmTramitacao,
    async () =>
      db
        .select({
          id: tramitacao.id,
          data: tramitacao.data,
          orgao: tramitacao.orgao,
          descricaoResumida: tramitacao.descricaoResumida,
          descricaoCompleta: tramitacao.descricaoCompleta,
          situacaoResultante: tramitacao.situacaoResultante,
        })
        .from(tramitacao)
        .where(eq(tramitacao.proposicaoId, proposicaoId))
        .orderBy(desc(tramitacao.data)),
  )
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
