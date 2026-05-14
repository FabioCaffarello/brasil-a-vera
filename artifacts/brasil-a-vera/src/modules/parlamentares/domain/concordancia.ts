export type Voto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

export interface VotoParlamentar {
  votacaoId: string
  voto: Voto
}

export interface ConcordanciaPar {
  parlamentarA: string
  parlamentarB: string
  total: number
  coincidentes: number
  percentual: number | null
}

export const CONCORDANCIA_AMOSTRA_MINIMA = 5
