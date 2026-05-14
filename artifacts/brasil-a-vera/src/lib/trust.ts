import { TRUST_LEVEL_LABELS, type TrustLevel } from '@/shared/trust'

export function getTrustLevelColor(level: TrustLevel): string {
  const colors: Record<TrustLevel, string> = {
    L1: 'bg-green-50 text-green-700 border-green-200',
    L2: 'bg-blue-50 text-blue-700 border-blue-200',
    L3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    L4: 'bg-orange-50 text-orange-700 border-orange-200',
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
