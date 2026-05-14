export const ALINHAMENTO_AMOSTRA_MINIMA = 50

export type Voto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'
export type Orientacao = 'SIM' | 'NAO' | 'LIBERADO' | 'OBSTRUCAO'
export type Classificacao = 'ALINHADO' | 'DIVERGENTE' | 'IGNORADO'

export function classifyAlinhamento(voto: Voto, orientacao: Orientacao): Classificacao {
  if (orientacao === 'LIBERADO') return 'IGNORADO'
  if (voto === 'AUSENTE') return 'IGNORADO'
  return voto === orientacao ? 'ALINHADO' : 'DIVERGENTE'
}
