import type { Votacao } from '../../../domain/votacao.aggregate'

export type VotacaoOutput = {
  votacaoId: string
  idExterno: string
  proposicaoIdExterno: string | null
  dataHora: Date
  descricao: string
  orgao: string
  resultado: {
    votosSim: number
    votosNao: number
    abstencoes: number
    ausentes: number
    aprovada: boolean
  }
  votos: Array<{
    votoNominalId: string
    parlamentarIdExterno: string
    tipoVoto: string
    dataHora: Date | null
  }>
  orientacoes: Array<{
    partidoSigla: string
    orientacao: string
  }>
  trustLevel: string
  createdAt: Date
  updatedAt: Date
}

export function toVotacaoOutput(entity: Votacao): VotacaoOutput {
  return {
    votacaoId: entity.votacaoId.id,
    idExterno: entity.idExterno,
    proposicaoIdExterno: entity.proposicaoIdExterno,
    dataHora: entity.dataHora,
    descricao: entity.descricao,
    orgao: entity.orgao,
    resultado: {
      votosSim: entity.resultado.votosSim,
      votosNao: entity.resultado.votosNao,
      abstencoes: entity.resultado.abstencoes,
      ausentes: entity.resultado.ausentes,
      aprovada: entity.resultado.aprovada,
    },
    votos: entity.votos.map((v) => ({
      votoNominalId: v.votoNominalId.id,
      parlamentarIdExterno: v.parlamentarIdExterno,
      tipoVoto: v.tipoVoto,
      dataHora: v.dataHora,
    })),
    orientacoes: entity.orientacoes.map((o) => ({
      partidoSigla: o.partidoSigla,
      orientacao: o.orientacao,
    })),
    trustLevel: entity.trust.trustLevel,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
