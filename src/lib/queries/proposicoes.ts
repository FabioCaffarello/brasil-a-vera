import { and, asc, desc, eq } from 'drizzle-orm'

import { db } from '@/shared/db'
import {
  parlamentar,
  proposicao,
  proposicaoAutor,
  proposicaoTema,
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

export interface FiltrosProposicao {
  tipo?: TipoProposicao
  ano?: number
  situacao?: SituacaoProposicao
}

export async function listProposicoes(
  filtros: FiltrosProposicao = {},
  limit = 50,
) {
  const where = []
  if (filtros.tipo) where.push(eq(proposicao.tipo, filtros.tipo))
  if (filtros.ano) where.push(eq(proposicao.ano, filtros.ano))
  if (filtros.situacao) where.push(eq(proposicao.situacao, filtros.situacao))

  return db
    .select({
      id: proposicao.id,
      tipo: proposicao.tipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      situacao: proposicao.situacao,
      sourceUrl: proposicao.sourceUrl,
    })
    .from(proposicao)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(proposicao.ano), desc(proposicao.numero))
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

export async function getAnosDistintos(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ ano: proposicao.ano })
    .from(proposicao)
    .orderBy(desc(proposicao.ano))
  return rows.map((r) => r.ano)
}
