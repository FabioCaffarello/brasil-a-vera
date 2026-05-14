import { describe, expect, it } from 'vitest'

import {
  getTrustLevelColor,
  getTrustLevelDisclaimer,
  getTrustLevelLabel,
} from './trust'

describe('getTrustLevelColor', () => {
  it('retorna classes Tailwind únicas por nível', () => {
    const all = [
      getTrustLevelColor('L1'),
      getTrustLevelColor('L2'),
      getTrustLevelColor('L3'),
      getTrustLevelColor('L4'),
    ]
    expect(new Set(all).size).toBe(4)
    for (const c of all) {
      expect(c).toContain('bg-')
      expect(c).toContain('text-')
      expect(c).toContain('border-')
    }
  })
})

describe('getTrustLevelLabel', () => {
  it('delega ao TRUST_LEVEL_LABELS — retorna string não-vazia para cada nível', () => {
    for (const level of ['L1', 'L2', 'L3', 'L4'] as const) {
      expect(getTrustLevelLabel(level)).toBeTruthy()
    }
  })
})

describe('getTrustLevelDisclaimer', () => {
  it('L1 e L2 não têm disclaimer (dados primários e derivados explícitos)', () => {
    expect(getTrustLevelDisclaimer('L1')).toBeNull()
    expect(getTrustLevelDisclaimer('L2')).toBeNull()
  })
  it('L3 e L4 têm disclaimer alertando para cálculo derivado / estimativa', () => {
    expect(getTrustLevelDisclaimer('L3')).toMatch(/cálculo derivado/)
    expect(getTrustLevelDisclaimer('L4')).toMatch(/estimativa/)
  })
})
