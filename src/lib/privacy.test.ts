import { describe, expect, it } from 'vitest'

import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_MIN_AGE_WITH_GUARDIAN,
  PRIVACY_MIN_AGE_WITHOUT_GUARDIAN,
  PRIVACY_POLICY_EFFECTIVE_AT,
  PRIVACY_POLICY_VERSION,
} from './privacy'

describe('privacy constants', () => {
  it('PRIVACY_POLICY_VERSION segue formato ISO YYYY-MM-DD', () => {
    expect(PRIVACY_POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('PRIVACY_POLICY_VERSION é parseável como Date', () => {
    const parsed = new Date(`${PRIVACY_POLICY_VERSION}T00:00:00Z`)
    expect(Number.isNaN(parsed.getTime())).toBe(false)
  })

  it('PRIVACY_POLICY_EFFECTIVE_AT bate com PRIVACY_POLICY_VERSION', () => {
    // Versão é a data ISO da efetivação. Mantê-las em sincronia evita
    // confusão entre "data do texto" e "data de vigência".
    const fromVersion = new Date(`${PRIVACY_POLICY_VERSION}T00:00:00Z`)
    expect(PRIVACY_POLICY_EFFECTIVE_AT.toISOString()).toBe(
      fromVersion.toISOString(),
    )
  })

  it('PRIVACY_CONTACT_EMAIL é endereço válido', () => {
    expect(PRIVACY_CONTACT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
  })

  it('PRIVACY_CONTACT_EMAIL usa subdomínio lgpd@', () => {
    expect(PRIVACY_CONTACT_EMAIL.startsWith('lgpd@')).toBe(true)
  })

  it('idade com guardião é menor que idade sem guardião', () => {
    expect(PRIVACY_MIN_AGE_WITH_GUARDIAN).toBeLessThan(
      PRIVACY_MIN_AGE_WITHOUT_GUARDIAN,
    )
  })

  it('idade sem guardião é 18 (maioridade civil)', () => {
    expect(PRIVACY_MIN_AGE_WITHOUT_GUARDIAN).toBe(18)
  })

  it('idade com guardião é 16 (Código Civil art. 4º)', () => {
    expect(PRIVACY_MIN_AGE_WITH_GUARDIAN).toBe(16)
  })
})
