import { describe, expect, it } from 'vitest'

import { formatNumeroAbreviado } from './format-number'

describe('formatNumeroAbreviado', () => {
  it('formata < 1000 com separador PT-BR', () => {
    expect(formatNumeroAbreviado(0)).toBe('0')
    expect(formatNumeroAbreviado(721)).toBe('721')
    expect(formatNumeroAbreviado(999)).toBe('999')
  })

  it('formata >= 1000 como X,Y mil', () => {
    expect(formatNumeroAbreviado(1000)).toBe('1,0 mil')
    expect(formatNumeroAbreviado(1635)).toBe('1,6 mil')
    expect(formatNumeroAbreviado(8852)).toBe('8,9 mil')
    expect(formatNumeroAbreviado(17743)).toBe('17,7 mil')
  })

  it('formata >= 1.000.000 como X,Y mi', () => {
    expect(formatNumeroAbreviado(1_000_000)).toBe('1,0 mi')
    expect(formatNumeroAbreviado(2_500_000)).toBe('2,5 mi')
  })

  it('usa vírgula como separador decimal (PT-BR)', () => {
    expect(formatNumeroAbreviado(1500)).toContain(',')
    expect(formatNumeroAbreviado(1500)).not.toContain('.')
  })
})
