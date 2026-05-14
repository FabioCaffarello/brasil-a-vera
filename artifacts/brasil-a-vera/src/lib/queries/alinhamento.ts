export type Voto = string
export type Orientacao = string

export interface VotacaoAlinhamento {
  votacaoId: string
  dataHora: Date | string
  descricao: string
  voto: Voto
  orientacao: Orientacao
}

export interface AlinhamentoResult {
  partidoSigla: string | null
  percentual: number | null
  total: number
  alinhados: number
  divergentes: number
  amostraInsuficiente: boolean
  topDivergencias: VotacaoAlinhamento[]
  topConvergencias: VotacaoAlinhamento[]
}
