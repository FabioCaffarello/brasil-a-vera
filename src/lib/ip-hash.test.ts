import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  extractIpFromRequest,
  getIpSalt,
  hashIp,
  hashIpFromRequest,
} from './ip-hash'

const FIXED_DATE = new Date('2026-05-19T15:00:00.000Z')
const FIXED_SALT = 'a'.repeat(64) // 32 bytes hex (1 char repeated)

describe('hashIp', () => {
  it('produz hex SHA-256 (64 chars)', async () => {
    const hash = await hashIp({
      ip: '203.0.113.42',
      date: FIXED_DATE,
      salt: FIXED_SALT,
    })
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('é determinístico (mesmo input → mesmo hash)', async () => {
    const h1 = await hashIp({
      ip: '203.0.113.42',
      date: FIXED_DATE,
      salt: FIXED_SALT,
    })
    const h2 = await hashIp({
      ip: '203.0.113.42',
      date: FIXED_DATE,
      salt: FIXED_SALT,
    })
    expect(h1).toBe(h2)
  })

  it('IP diferente → hash diferente', async () => {
    const h1 = await hashIp({
      ip: '203.0.113.42',
      date: FIXED_DATE,
      salt: FIXED_SALT,
    })
    const h2 = await hashIp({
      ip: '203.0.113.43',
      date: FIXED_DATE,
      salt: FIXED_SALT,
    })
    expect(h1).not.toBe(h2)
  })

  it('data diferente → hash diferente (no correlation cross-day)', async () => {
    const day1 = new Date('2026-05-19T15:00:00.000Z')
    const day2 = new Date('2026-05-20T15:00:00.000Z')
    const h1 = await hashIp({
      ip: '203.0.113.42',
      date: day1,
      salt: FIXED_SALT,
    })
    const h2 = await hashIp({
      ip: '203.0.113.42',
      date: day2,
      salt: FIXED_SALT,
    })
    expect(h1).not.toBe(h2)
  })

  it('salt diferente → hash diferente', async () => {
    const h1 = await hashIp({
      ip: '203.0.113.42',
      date: FIXED_DATE,
      salt: 'a'.repeat(64),
    })
    const h2 = await hashIp({
      ip: '203.0.113.42',
      date: FIXED_DATE,
      salt: 'b'.repeat(64),
    })
    expect(h1).not.toBe(h2)
  })

  it('usa UTC para formatar data (sem drift por timezone do host)', async () => {
    // 23:30 UTC do dia X = mesmo dia X no UTC; 00:30 UTC do dia X+1
    // deveria produzir hash diferente (próximo dia operacional).
    const lateDay = new Date('2026-05-19T23:30:00.000Z')
    const earlyNextDay = new Date('2026-05-20T00:30:00.000Z')
    const h1 = await hashIp({
      ip: '203.0.113.42',
      date: lateDay,
      salt: FIXED_SALT,
    })
    const h2 = await hashIp({
      ip: '203.0.113.42',
      date: earlyNextDay,
      salt: FIXED_SALT,
    })
    expect(h1).not.toBe(h2)
  })
})

describe('extractIpFromRequest', () => {
  it('prioriza cf-connecting-ip', () => {
    const req = new Request('https://example.com/', {
      headers: {
        'cf-connecting-ip': '203.0.113.42',
        'x-forwarded-for': '198.51.100.7',
      },
    })
    expect(extractIpFromRequest(req)).toBe('203.0.113.42')
  })

  it('cai para x-forwarded-for se cf-connecting-ip ausente', () => {
    const req = new Request('https://example.com/', {
      headers: { 'x-forwarded-for': '198.51.100.7' },
    })
    expect(extractIpFromRequest(req)).toBe('198.51.100.7')
  })

  it('extrai primeira entrada de x-forwarded-for (chain de proxies)', () => {
    const req = new Request('https://example.com/', {
      headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1, 10.0.0.2' },
    })
    expect(extractIpFromRequest(req)).toBe('198.51.100.7')
  })

  it('devolve null se nenhum header presente', () => {
    const req = new Request('https://example.com/')
    expect(extractIpFromRequest(req)).toBeNull()
  })

  it('devolve null se cf-connecting-ip é string vazia', () => {
    const req = new Request('https://example.com/', {
      headers: { 'cf-connecting-ip': '' },
    })
    expect(extractIpFromRequest(req)).toBeNull()
  })
})

describe('getIpSalt', () => {
  const originalEnv = process.env.IP_HASH_SALT

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.IP_HASH_SALT
    } else {
      process.env.IP_HASH_SALT = originalEnv
    }
  })

  it('devolve salt quando configurado', () => {
    process.env.IP_HASH_SALT = FIXED_SALT
    expect(getIpSalt()).toBe(FIXED_SALT)
  })

  it('devolve null quando undefined', () => {
    delete process.env.IP_HASH_SALT
    expect(getIpSalt()).toBeNull()
  })

  it('devolve null quando string vazia', () => {
    process.env.IP_HASH_SALT = ''
    expect(getIpSalt()).toBeNull()
  })
})

describe('hashIpFromRequest', () => {
  const originalEnv = process.env.IP_HASH_SALT

  beforeEach(() => {
    process.env.IP_HASH_SALT = FIXED_SALT
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.IP_HASH_SALT
    } else {
      process.env.IP_HASH_SALT = originalEnv
    }
    vi.restoreAllMocks()
  })

  it('hasha quando IP e salt disponíveis', async () => {
    const req = new Request('https://example.com/', {
      headers: { 'cf-connecting-ip': '203.0.113.42' },
    })
    const hash = await hashIpFromRequest(req, FIXED_DATE)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('devolve string vazia quando IP ausente', async () => {
    const req = new Request('https://example.com/')
    const hash = await hashIpFromRequest(req, FIXED_DATE)
    expect(hash).toBe('')
  })

  it('devolve string vazia quando salt ausente', async () => {
    delete process.env.IP_HASH_SALT
    const req = new Request('https://example.com/', {
      headers: { 'cf-connecting-ip': '203.0.113.42' },
    })
    const hash = await hashIpFromRequest(req, FIXED_DATE)
    expect(hash).toBe('')
  })

  it('bate com hashIp direto (mesmas entradas)', async () => {
    const req = new Request('https://example.com/', {
      headers: { 'cf-connecting-ip': '203.0.113.42' },
    })
    const fromReq = await hashIpFromRequest(req, FIXED_DATE)
    const direct = await hashIp({
      ip: '203.0.113.42',
      date: FIXED_DATE,
      salt: FIXED_SALT,
    })
    expect(fromReq).toBe(direct)
  })
})
