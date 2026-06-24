import { desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
  proposicao,
  votacaoComissaoSenado,
  votoNominalComissaoSenado,
} from '@/shared/db/schema'

export interface VotacaoComissaoItem {
  id: string
  comissaoSigla: string
  dataSessao: string
  descricao: string
  resultado: string | null
  voto: string | null
  votosSim: number
  votosNao: number
  abstencoes: number
}

export interface VotacaoComissaoProposicaoItem {
  id: string
  comissaoSigla: string
  dataSessao: string
  descricao: string
  resultado: string | null
  votosSim: number
  votosNao: number
  abstencoes: number
}

// Votações nominais em comissão para um senador (ADR-057).
// Retorna as últimas 50 — suficiente para o perfil sem paginar.
// Cache 24h: mesmo horizonte da ingestão diária.
export async function getVotacoesComissaoByParlamentar(
  parlamentarId: string,
): Promise<VotacaoComissaoItem[]> {
  return cached(
    `votacoes-comissao:parlamentar:${parlamentarId}`,
    TTL.liderancas,
    async () => {
      const rows = await db
        .select({
          id: votacaoComissaoSenado.id,
          comissaoSigla: votacaoComissaoSenado.comissaoSigla,
          dataSessao: votacaoComissaoSenado.dataSessao,
          descricao: votacaoComissaoSenado.descricao,
          resultado: votacaoComissaoSenado.resultado,
          voto: votoNominalComissaoSenado.voto,
          votosSim: votacaoComissaoSenado.votosSim,
          votosNao: votacaoComissaoSenado.votosNao,
          abstencoes: votacaoComissaoSenado.abstencoes,
        })
        .from(votoNominalComissaoSenado)
        .innerJoin(
          votacaoComissaoSenado,
          eq(votacaoComissaoSenado.id, votoNominalComissaoSenado.votacaoId),
        )
        .where(eq(votoNominalComissaoSenado.parlamentarId, parlamentarId))
        .orderBy(desc(votacaoComissaoSenado.dataSessao))
        .limit(50)
      return rows as VotacaoComissaoItem[]
    },
  )
}

// Votações em comissão do Senado para uma proposição (ADR-057).
// Join via materia_source_id = proposicao.source_id_senado (codigoMateria).
// Retorna até 50 registros ordenados por data decrescente.
export async function getVotacoesComissaoByProposicao(
  proposicaoId: string,
): Promise<VotacaoComissaoProposicaoItem[]> {
  return cached(
    `votacoes-comissao:proposicao:${proposicaoId}`,
    TTL.liderancas,
    async () => {
      const rows = await db
        .select({
          id: votacaoComissaoSenado.id,
          comissaoSigla: votacaoComissaoSenado.comissaoSigla,
          dataSessao: votacaoComissaoSenado.dataSessao,
          descricao: votacaoComissaoSenado.descricao,
          resultado: votacaoComissaoSenado.resultado,
          votosSim: votacaoComissaoSenado.votosSim,
          votosNao: votacaoComissaoSenado.votosNao,
          abstencoes: votacaoComissaoSenado.abstencoes,
        })
        .from(votacaoComissaoSenado)
        .innerJoin(
          proposicao,
          eq(proposicao.sourceIdSenado, votacaoComissaoSenado.materiaSourceId),
        )
        .where(eq(proposicao.id, proposicaoId))
        .orderBy(desc(votacaoComissaoSenado.dataSessao))
        .limit(50)
      return rows as VotacaoComissaoProposicaoItem[]
    },
  )
}
