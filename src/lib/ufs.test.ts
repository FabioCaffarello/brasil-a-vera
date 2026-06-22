import { describe, expect, it } from 'vitest'

import { isUfValida, nomeUf, UFS } from './ufs'

describe('ufs', () => {
  it('tem as 27 unidades da federação', () => {
    expect(UFS).toHaveLength(27)
  })

  it('nomeUf resolve sigla (case-insensitive)', () => {
    expect(nomeUf('SP')).toBe('São Paulo')
    expect(nomeUf('ap')).toBe('Amapá')
    expect(nomeUf('XX')).toBeNull()
  })

  it('isUfValida', () => {
    expect(isUfValida('RJ')).toBe(true)
    expect(isUfValida('rj')).toBe(true)
    expect(isUfValida('ZZ')).toBe(false)
  })
})
