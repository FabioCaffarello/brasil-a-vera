export type Casa = 'CAMARA' | 'SENADO'
export type TipoVoto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

export const TIPOS_VOTO: readonly TipoVoto[] = [
  'SIM', 'NAO', 'ABSTENCAO', 'AUSENTE', 'OBSTRUCAO',
] as const

export interface FiltrosVotacao {
  casa?: Casa
  ano?: number
  resultado?: 'aprovadas' | 'rejeitadas'
  somenteNominais?: boolean
}

export interface VotoIndividual {
  id: string
  voto: string
  parlamentarId: string
  parlamentarNome: string
  parlamentarPartidoSigla: string
  parlamentarUf: string
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
