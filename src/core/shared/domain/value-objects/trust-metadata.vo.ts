import { ValueObject } from '../value-object'

export type TrustLevel = 'L1' | 'L2' | 'L3' | 'L4'

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

export class TrustMetadata extends ValueObject {
  readonly trustLevel: TrustLevel
  readonly sourceUrl?: string
  readonly formulaUrl?: string
  readonly disclaimer?: string

  constructor(
    trustLevel: TrustLevel,
    sourceUrl?: string,
    formulaUrl?: string,
    disclaimer?: string,
  ) {
    super()
    this.trustLevel = trustLevel
    this.sourceUrl = sourceUrl
    this.formulaUrl = formulaUrl
    this.disclaimer = disclaimer
  }

  static official(sourceUrl: string): TrustMetadata {
    return new TrustMetadata('L1', sourceUrl)
  }

  static aggregated(sourceUrl: string): TrustMetadata {
    return new TrustMetadata('L2', sourceUrl)
  }

  static derived(formulaUrl: string, disclaimer: string): TrustMetadata {
    return new TrustMetadata('L3', undefined, formulaUrl, disclaimer)
  }

  static estimated(disclaimer: string): TrustMetadata {
    return new TrustMetadata('L4', undefined, undefined, disclaimer)
  }

  requiresDisclaimer(): boolean {
    return this.trustLevel === 'L3' || this.trustLevel === 'L4'
  }
}
