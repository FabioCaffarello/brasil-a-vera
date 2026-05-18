import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from './cursor'

const TestSchema = z.object({
  v: z.literal(1),
  d: z.number().int().positive(),
  id: z.string().uuid(),
})

const NORMAL_UUID = '019e184f-0cdd-7109-ab34-bbfa9f92bd13'

describe('cursor (ADR-026 helpers)', () => {
  it('encode → decode preserva payload', () => {
    const original = { v: 1 as const, d: 1_700_000_000_000, id: NORMAL_UUID }
    const token = encodeCursor(original)
    const decoded = decodeCursor(token, TestSchema)
    expect(decoded).toEqual(original)
  })

  it('decode retorna undefined quando token é omitido', () => {
    expect(decodeCursor(undefined, TestSchema)).toBeUndefined()
  })

  it('decode retorna undefined quando token é string vazia', () => {
    expect(decodeCursor('', TestSchema)).toBeUndefined()
  })

  it('decode retorna null para base64 corrompido', () => {
    expect(decodeCursor('@@@invalid@@@', TestSchema)).toBeNull()
  })

  it('decode retorna null quando shape diverge do schema', () => {
    const token = encodeCursor({
      v: 1,
      d: 'string-em-vez-de-number',
      id: NORMAL_UUID,
    })
    expect(decodeCursor(token, TestSchema)).toBeNull()
  })

  it('decode retorna null para versão antiga (v != 1)', () => {
    const token = encodeCursor({ v: 99, d: 1_700_000_000_000, id: NORMAL_UUID })
    expect(decodeCursor(token, TestSchema)).toBeNull()
  })

  it('encode produz string URL-safe (sem +, /, =)', () => {
    // Payload longo aumenta chance de chars problemáticos no base64 puro.
    const token = encodeCursor({
      v: 1,
      d: 1_700_000_000_000,
      id: NORMAL_UUID,
      extra: '====',
    })
    expect(token).not.toMatch(/[+/=]/)
  })

  it('encode é determinístico (mesmo input → mesmo token)', () => {
    const p = { v: 1 as const, d: 42, id: NORMAL_UUID }
    expect(encodeCursor(p)).toBe(encodeCursor(p))
  })
})
