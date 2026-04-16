export const SITUACAO_PROPOSICAO_VALUES = [
  'TRAMITANDO',
  'APROVADA',
  'REJEITADA',
  'ARQUIVADA',
  'TRANSFORMADA_EM_NORMA',
  'DESCONHECIDA',
] as const

export type SituacaoProposicao = (typeof SITUACAO_PROPOSICAO_VALUES)[number]

export function isSituacaoProposicao(
  value: string,
): value is SituacaoProposicao {
  return (SITUACAO_PROPOSICAO_VALUES as readonly string[]).includes(value)
}
