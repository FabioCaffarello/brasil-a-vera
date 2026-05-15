import { desc, eq, sql } from 'drizzle-orm'
import type { Casa } from '@/lib/queries/votacoes'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { proposicaoTema } from '@/modules/proposicoes/domain/schema'
import { votacao, votoNominal } from '@/modules/votacoes/domain/schema'
import { db } from '@/shared/db'

// Queries específicas para alimentar feeds RSS segmentados. Cada uma retorna
// até `limit` votações ordenadas por data desc, com os campos necessários
// para o item RSS (id, casa, data, descrição, resultado).
//
// Sprint 3.2 Tarefa 2.

export type RssVotacaoRow = {
  id: string
  casa: Casa
  dataHora: Date
  descricao: string
  aprovada: boolean
  votosSim: number
  votosNao: number
  abstencoes: number
}

const SELECT_VOTACAO = {
  id: votacao.id,
  casa: votacao.casa,
  dataHora: votacao.dataHora,
  descricao: votacao.descricao,
  aprovada: votacao.aprovada,
  votosSim: votacao.votosSim,
  votosNao: votacao.votosNao,
  abstencoes: votacao.abstencoes,
}

export async function getRssVotacoesGlobal(
  limit: number,
): Promise<RssVotacaoRow[]> {
  return db
    .select(SELECT_VOTACAO)
    .from(votacao)
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

export async function getRssVotacoesByCasa(
  casa: Casa,
  limit: number,
): Promise<RssVotacaoRow[]> {
  return db
    .select(SELECT_VOTACAO)
    .from(votacao)
    .where(eq(votacao.casa, casa))
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

// Para UF/partido: pega votações com pelo menos 1 voto de parlamentar
// que satisfaz o critério. DISTINCT necessário porque mesmas votações
// terão dezenas de votos casados.
export async function getRssVotacoesByUf(
  uf: string,
  limit: number,
): Promise<RssVotacaoRow[]> {
  return db
    .selectDistinct(SELECT_VOTACAO)
    .from(votacao)
    .innerJoin(votoNominal, eq(votoNominal.votacaoId, votacao.id))
    .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
    .where(eq(parlamentar.uf, uf))
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

export async function getRssVotacoesByPartido(
  partidoSigla: string,
  limit: number,
): Promise<RssVotacaoRow[]> {
  return db
    .selectDistinct(SELECT_VOTACAO)
    .from(votacao)
    .innerJoin(votoNominal, eq(votoNominal.votacaoId, votacao.id))
    .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
    .where(eq(parlamentar.partidoSigla, partidoSigla))
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

export async function getRssVotacoesByTema(
  codigoTema: number,
  limit: number,
): Promise<RssVotacaoRow[]> {
  return db
    .selectDistinct(SELECT_VOTACAO)
    .from(votacao)
    .innerJoin(
      proposicaoTema,
      eq(proposicaoTema.proposicaoId, votacao.proposicaoId),
    )
    .where(eq(proposicaoTema.codigoTema, codigoTema))
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

export type TemaInfo = {
  codigo: number
  nome: string
  totalProposicoes: number
}

// Lista temas distintos com contagem de proposições vinculadas. Usado pelo
// /feed index para listar feeds disponíveis por tema. Limite implícito:
// catálogo oficial da Câmara tem ~30 temas — sem paginação.
export async function getTemasDistintos(): Promise<TemaInfo[]> {
  const rows = await db
    .select({
      codigo: proposicaoTema.codigoTema,
      nome: proposicaoTema.nomeTema,
      total: sql<number>`count(distinct ${proposicaoTema.proposicaoId})::int`,
    })
    .from(proposicaoTema)
    .groupBy(proposicaoTema.codigoTema, proposicaoTema.nomeTema)
    .orderBy(proposicaoTema.nomeTema)

  return rows.map((r) => ({
    codigo: r.codigo,
    nome: r.nome,
    totalProposicoes: r.total,
  }))
}
