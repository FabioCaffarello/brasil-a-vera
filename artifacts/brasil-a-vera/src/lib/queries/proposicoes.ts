export type TipoProposicao = 'PL' | 'PEC' | 'PLP' | 'MPV' | 'PDC' | 'PRC'
export type SituacaoProposicao = 'TRAMITANDO' | 'APROVADA' | 'REJEITADA' | 'ARQUIVADA' | 'TRANSFORMADA_EM_NORMA'

export const TIPOS_PROPOSICAO: readonly TipoProposicao[] = [
  'PL', 'PEC', 'PLP', 'MPV', 'PDC', 'PRC',
] as const

export interface FiltrosProposicao {
  tipo?: TipoProposicao
  ano?: number
  situacao?: SituacaoProposicao
}
