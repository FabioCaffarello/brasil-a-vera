import { describe, expect, it } from 'vitest'

import { computeIdempotencyKey, currentWeeklyPeriod } from './cron-period'

describe('currentWeeklyPeriod', () => {
  it('quarta-feira → próximo domingo 21:00 UTC', () => {
    // 2026-05-13 (quarta) 14:00 UTC
    const now = new Date('2026-05-13T14:00:00.000Z')
    const period = currentWeeklyPeriod(now)
    // Próximo domingo é 2026-05-17 21:00 UTC
    expect(period.scheduledFor.toISOString()).toBe('2026-05-17T21:00:00.000Z')
    expect(period.periodEnd.toISOString()).toBe('2026-05-17T21:00:00.000Z')
    expect(period.periodStart.toISOString()).toBe('2026-05-10T21:00:00.000Z')
  })

  it('domingo ANTES das 21:00 UTC → hoje mesmo', () => {
    // 2026-05-17 (domingo) 12:00 UTC
    const now = new Date('2026-05-17T12:00:00.000Z')
    const period = currentWeeklyPeriod(now)
    expect(period.scheduledFor.toISOString()).toBe('2026-05-17T21:00:00.000Z')
  })

  it('domingo APÓS 21:00 UTC → próximo domingo', () => {
    // 2026-05-17 (domingo) 22:00 UTC
    const now = new Date('2026-05-17T22:00:00.000Z')
    const period = currentWeeklyPeriod(now)
    expect(period.scheduledFor.toISOString()).toBe('2026-05-24T21:00:00.000Z')
  })

  it('period é janela exata de 7 dias', () => {
    const period = currentWeeklyPeriod(new Date('2026-05-13T14:00:00.000Z'))
    const diffMs = period.periodEnd.getTime() - period.periodStart.getTime()
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000)
  })
})

describe('computeIdempotencyKey', () => {
  it('gera hex sha256 determinístico (mesma entrada → mesmo hash)', async () => {
    const input = {
      userId: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
      periodStart: new Date('2026-05-10T21:00:00.000Z'),
      cadence: 'weekly' as const,
      channel: 'email' as const,
    }
    const a = await computeIdempotencyKey(input)
    const b = await computeIdempotencyKey(input)
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('canal diferente → hash diferente', async () => {
    const base = {
      userId: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
      periodStart: new Date('2026-05-10T21:00:00.000Z'),
      cadence: 'weekly' as const,
    }
    const emailKey = await computeIdempotencyKey({
      ...base,
      channel: 'email',
    })
    const inappKey = await computeIdempotencyKey({
      ...base,
      channel: 'inapp',
    })
    expect(emailKey).not.toBe(inappKey)
  })

  it('period diferente → hash diferente', async () => {
    const base = {
      userId: '019e184f-0cdd-7109-ab34-bbfa9f92bd13',
      cadence: 'weekly' as const,
      channel: 'email' as const,
    }
    const a = await computeIdempotencyKey({
      ...base,
      periodStart: new Date('2026-05-10T21:00:00.000Z'),
    })
    const b = await computeIdempotencyKey({
      ...base,
      periodStart: new Date('2026-05-17T21:00:00.000Z'),
    })
    expect(a).not.toBe(b)
  })

  it('userId diferente → hash diferente', async () => {
    const base = {
      periodStart: new Date('2026-05-10T21:00:00.000Z'),
      cadence: 'weekly' as const,
      channel: 'email' as const,
    }
    const a = await computeIdempotencyKey({
      ...base,
      userId: 'aaa',
    })
    const b = await computeIdempotencyKey({
      ...base,
      userId: 'bbb',
    })
    expect(a).not.toBe(b)
  })
})
