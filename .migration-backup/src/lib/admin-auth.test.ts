import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkAdminKey, getExpectedAdminKey } from './admin-auth'

describe('checkAdminKey', () => {
  const valida = 'a'.repeat(32)

  it('retorna ok quando o header bate com a chave esperada', () => {
    expect(checkAdminKey(valida, valida)).toEqual({ ok: true })
  })

  it('retorna missing quando o header é null', () => {
    expect(checkAdminKey(null, valida)).toEqual({
      ok: false,
      reason: 'missing',
    })
  })

  it('retorna missing quando o header é string vazia', () => {
    expect(checkAdminKey('', valida)).toEqual({
      ok: false,
      reason: 'missing',
    })
  })

  it('retorna invalid quando o header tem mesmo comprimento mas conteúdo diferente', () => {
    expect(checkAdminKey('b'.repeat(32), valida)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('retorna invalid quando o header tem comprimento diferente do esperado', () => {
    expect(checkAdminKey('chave-curta', valida)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })
})

describe('getExpectedAdminKey', () => {
  let original: string | undefined

  beforeEach(() => {
    original = process.env.ADMIN_API_KEY
  })

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ADMIN_API_KEY
    } else {
      process.env.ADMIN_API_KEY = original
    }
  })

  it('retorna null quando ADMIN_API_KEY não está definida', () => {
    delete process.env.ADMIN_API_KEY
    expect(getExpectedAdminKey()).toBeNull()
  })

  it('retorna null quando ADMIN_API_KEY tem menos de 32 chars', () => {
    process.env.ADMIN_API_KEY = 'short'
    expect(getExpectedAdminKey()).toBeNull()
  })

  it('retorna a chave quando atende ao tamanho mínimo', () => {
    const chave = 'x'.repeat(32)
    process.env.ADMIN_API_KEY = chave
    expect(getExpectedAdminKey()).toBe(chave)
  })
})
