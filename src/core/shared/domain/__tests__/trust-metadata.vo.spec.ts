import { describe, expect, it } from 'vitest'
import {
  isTrustLevel,
  TRUST_LEVEL_DESCRIPTIONS,
  TRUST_LEVEL_LABELS,
  TrustMetadata,
} from '../value-objects/trust-metadata.vo'

describe('TrustMetadata', () => {
  describe('factory methods', () => {
    it('should create official (L1) metadata', () => {
      const trust = TrustMetadata.official('https://api.camara.leg.br')
      expect(trust.trustLevel).toBe('L1')
      expect(trust.sourceUrl).toBe('https://api.camara.leg.br')
      expect(trust.formulaUrl).toBeUndefined()
      expect(trust.disclaimer).toBeUndefined()
    })

    it('should create aggregated (L2) metadata', () => {
      const trust = TrustMetadata.aggregated('https://source.example.com')
      expect(trust.trustLevel).toBe('L2')
      expect(trust.sourceUrl).toBe('https://source.example.com')
    })

    it('should create derived (L3) metadata', () => {
      const trust = TrustMetadata.derived(
        'https://formulas.example.com/calc',
        'Baseado em modelo estatístico',
      )
      expect(trust.trustLevel).toBe('L3')
      expect(trust.sourceUrl).toBeUndefined()
      expect(trust.formulaUrl).toBe('https://formulas.example.com/calc')
      expect(trust.disclaimer).toBe('Baseado em modelo estatístico')
    })

    it('should create estimated (L4) metadata', () => {
      const trust = TrustMetadata.estimated('Estimativa baseada em heurística')
      expect(trust.trustLevel).toBe('L4')
      expect(trust.sourceUrl).toBeUndefined()
      expect(trust.formulaUrl).toBeUndefined()
      expect(trust.disclaimer).toBe('Estimativa baseada em heurística')
    })
  })

  describe('requiresDisclaimer', () => {
    it('should not require disclaimer for L1', () => {
      expect(TrustMetadata.official('url').requiresDisclaimer()).toBe(false)
    })

    it('should not require disclaimer for L2', () => {
      expect(TrustMetadata.aggregated('url').requiresDisclaimer()).toBe(false)
    })

    it('should require disclaimer for L3', () => {
      expect(TrustMetadata.derived('url', 'desc').requiresDisclaimer()).toBe(
        true,
      )
    })

    it('should require disclaimer for L4', () => {
      expect(TrustMetadata.estimated('desc').requiresDisclaimer()).toBe(true)
    })
  })

  describe('equals', () => {
    it('should be equal with same values', () => {
      const t1 = TrustMetadata.official('https://api.example.com')
      const t2 = TrustMetadata.official('https://api.example.com')
      expect(t1.equals(t2)).toBe(true)
    })

    it('should not be equal with different levels', () => {
      const t1 = TrustMetadata.official('url')
      const t2 = TrustMetadata.aggregated('url')
      expect(t1.equals(t2)).toBe(false)
    })
  })
})

describe('isTrustLevel', () => {
  it('should return true for valid levels', () => {
    expect(isTrustLevel('L1')).toBe(true)
    expect(isTrustLevel('L2')).toBe(true)
    expect(isTrustLevel('L3')).toBe(true)
    expect(isTrustLevel('L4')).toBe(true)
  })

  it('should return false for invalid values', () => {
    expect(isTrustLevel('L0')).toBe(false)
    expect(isTrustLevel('L5')).toBe(false)
    expect(isTrustLevel('')).toBe(false)
    expect(isTrustLevel(null)).toBe(false)
    expect(isTrustLevel(undefined)).toBe(false)
    expect(isTrustLevel(1)).toBe(false)
  })
})

describe('Trust level constants', () => {
  it('should have labels for all levels', () => {
    expect(TRUST_LEVEL_LABELS.L1).toBeDefined()
    expect(TRUST_LEVEL_LABELS.L2).toBeDefined()
    expect(TRUST_LEVEL_LABELS.L3).toBeDefined()
    expect(TRUST_LEVEL_LABELS.L4).toBeDefined()
  })

  it('should have descriptions for all levels', () => {
    expect(TRUST_LEVEL_DESCRIPTIONS.L1).toBeDefined()
    expect(TRUST_LEVEL_DESCRIPTIONS.L2).toBeDefined()
    expect(TRUST_LEVEL_DESCRIPTIONS.L3).toBeDefined()
    expect(TRUST_LEVEL_DESCRIPTIONS.L4).toBeDefined()
  })
})
