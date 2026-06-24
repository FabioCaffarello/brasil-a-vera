import { desc, eq } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
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
