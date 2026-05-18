import { describe, expect, it } from 'vitest'

import { isUf, nomeUfCompleto, UFS } from './municipios'

describe('UFS', () => {
  it('contém exatamente 27 UFs (26 estados + DF)', () => {
    expect(UFS).toHaveLength(27)
    expect(UFS).toContain('DF')
    expect(UFS).toContain('SP')
    expect(UFS).toContain('AC')
  })
})

describe('isUf', () => {
  it('aceita UF válida', () => {
    expect(isUf('SP')).toBe(true)
    expect(isUf('DF')).toBe(true)
  })

  it('rejeita string inválida', () => {
    expect(isUf('XX')).toBe(false)
    expect(isUf('sp')).toBe(false) // case-sensitive
    expect(isUf('')).toBe(false)
  })

  it('rejeita não-string', () => {
    expect(isUf(null)).toBe(false)
    expect(isUf(123)).toBe(false)
    expect(isUf(undefined)).toBe(false)
  })
})

describe('nomeUfCompleto', () => {
  it('retorna nome completo da UF', () => {
    expect(nomeUfCompleto('SP')).toBe('São Paulo')
    expect(nomeUfCompleto('DF')).toBe('Distrito Federal')
    expect(nomeUfCompleto('RS')).toBe('Rio Grande do Sul')
  })
})
