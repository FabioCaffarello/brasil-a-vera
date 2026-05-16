import { TRUST_LEVEL_LABELS, type TrustLevel } from '@/shared/trust'

/**
 * Cores do badge de cada nível de confiança em tokens semânticos OKLCH
 * (Sprint 4.6 — Wave 4 polimento final).
 *
 * Mapeamento da pirâmide L1→L4 (confiança decai):
 * - L1 (dado oficial inteiro) → success subtle
 * - L2 (agregação determinística) → brand subtle (azul-marinho institucional)
 * - L3 (cálculo derivado / fórmula) → warning subtle
 * - L4 (estimativa) → warning solid (mesma família, saturação mais alta —
 *   sinaliza "atenção redobrada" sem invocar destructive, que é alarme)
 */
export function getTrustLevelColor(level: TrustLevel): string {
  const colors: Record<TrustLevel, string> = {
    L1: 'bg-success/10 text-success border-success/40',
    L2: 'bg-brand/10 text-brand border-brand/40',
    L3: 'bg-warning/10 text-warning border-warning/40',
    L4: 'bg-warning/20 text-warning border-warning',
  }
  return colors[level]
}

export function getTrustLevelLabel(level: TrustLevel): string {
  return TRUST_LEVEL_LABELS[level]
}

export function getTrustLevelDisclaimer(level: TrustLevel): string | null {
  const disclaimers: Partial<Record<TrustLevel, string>> = {
    L3: 'Este dado é um cálculo derivado. Consulte a fórmula para entender a metodologia.',
    L4: 'Este dado é uma estimativa. Pode não refletir a realidade com precisão.',
  }
  return disclaimers[level] ?? null
}
