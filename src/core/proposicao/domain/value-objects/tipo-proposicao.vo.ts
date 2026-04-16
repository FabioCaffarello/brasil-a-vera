// Wave 1: tipos mais comuns (Câmara + Senado unificados).
// Novos tipos podem ser adicionados conforme surgirem na ingestão.
export const TIPO_PROPOSICAO_VALUES = [
  'PL', // Projeto de Lei
  'PLP', // Projeto de Lei Complementar
  'PEC', // Proposta de Emenda à Constituição
  'MPV', // Medida Provisória
  'PDL', // Projeto de Decreto Legislativo
  'PRC', // Projeto de Resolução
  'PLV', // Projeto de Lei de Conversão
  'REQ', // Requerimento
  'PLS', // Projeto de Lei do Senado (legado — hoje vira PL)
  'OUTRO', // fallback
] as const

export type TipoProposicao = (typeof TIPO_PROPOSICAO_VALUES)[number]

export function isTipoProposicao(value: string): value is TipoProposicao {
  return (TIPO_PROPOSICAO_VALUES as readonly string[]).includes(value)
}
