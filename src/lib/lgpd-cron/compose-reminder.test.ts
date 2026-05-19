import { describe, expect, it } from 'vitest'

import { buildReminderEmail } from './compose-reminder'

const SIGN_IN_URL = 'https://brasilavera.org/sign-in'

describe('buildReminderEmail', () => {
  it('subject inclui dias restantes (plural)', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: 'Fabio',
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-26T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.subject).toBe(
      'Brasil à Vera · sua conta será eliminada em 5 dias',
    )
    expect(out.daysRemaining).toBe(5)
  })

  it('subject usa singular quando faltam exatamente 1 dia', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: null,
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-30T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.subject).toBe(
      'Brasil à Vera · sua conta será eliminada em 1 dia',
    )
    expect(out.daysRemaining).toBe(1)
  })

  it('daysRemaining nunca é negativo (se cron atrasa, mostra 0)', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: null,
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      // now já passou do hard-delete (edge case se cron de envio
      // demora mais que o hard-delete cron)
      now: new Date('2026-06-05T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.daysRemaining).toBe(0)
    expect(out.subject).toContain('em 0 dias')
  })

  it('greeting usa displayName quando presente', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: 'Fabio',
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-26T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.bodyMd).toContain('Olá, Fabio,')
  })

  it('greeting genérico quando displayName é null', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: null,
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-26T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.bodyMd).toMatch(/^Olá,$/m)
    expect(out.bodyMd).not.toContain('Olá, ,')
  })

  it('formata datas em DD/MM/YYYY pt-BR', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: null,
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-26T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.bodyMd).toContain('01/05/2026')
    expect(out.bodyMd).toContain('31/05/2026')
  })

  it('inclui link absoluto para signIn', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: null,
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-26T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.bodyMd).toContain(`[Fazer login agora](${SIGN_IN_URL})`)
  })

  it('explica preservação de consent_log (LGPD art. 16)', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: null,
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-26T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.bodyMd).toContain('LGPD art. 16')
  })

  it('explica natureza transacional (não desativável)', () => {
    const out = buildReminderEmail({
      email: 'a@a.com',
      displayName: null,
      deletedAt: new Date('2026-05-01T00:00:00Z'),
      hardDeleteAt: new Date('2026-05-31T00:00:00Z'),
      now: new Date('2026-05-26T00:00:00Z'),
      signInUrl: SIGN_IN_URL,
    })
    expect(out.bodyMd).toContain('comunicação transacional')
  })
})
