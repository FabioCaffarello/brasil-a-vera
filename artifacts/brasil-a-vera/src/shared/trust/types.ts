export type TrustLevel = 'L1' | 'L2' | 'L3' | 'L4'

export interface TrustMetadata {
  trustLevel: TrustLevel
  sourceUrl?: string
  formulaUrl?: string
  disclaimer?: string
}

export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  L1: 'Fonte oficial verificada',
  L2: 'Dados agregados verificáveis',
  L3: 'Cálculo derivado',
  L4: 'Estimativa ou modelo',
}

export const TRUST_LEVEL_DESCRIPTIONS: Record<TrustLevel, string> = {
  L1: 'Dado bruto de API oficial sem transformação',
  L2: 'Agregação ou cruzamento de fontes oficiais, reproduzível',
  L3: 'Cálculo derivado com fórmula aberta e auditável',
  L4: 'Estimativa baseada em modelo ou heurística',
}

export function isTrustLevel(value: unknown): value is TrustLevel {
  return value === 'L1' || value === 'L2' || value === 'L3' || value === 'L4'
}
