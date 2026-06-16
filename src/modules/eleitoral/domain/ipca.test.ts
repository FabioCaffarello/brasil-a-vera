import { describe, expect, it } from 'vitest'

import {
  corrigirParaBase,
  fatorCorrecao,
  IPCA_BASE_ANO,
  IPCA_INDICE_DEZEMBRO,
} from './ipca'

describe('corrigirParaBase', () => {
  it('ano-base é identidade (×1)', () => {
    expect(corrigirParaBase('1000.00', IPCA_BASE_ANO)).toBe('1000.00')
  })

  it('2018 → dez/2022: ×(6474.09/5100.61)', () => {
    expect(corrigirParaBase('1000.00', 2018)).toBe('1269.28')
  })

  it('2014 → dez/2022: ×(6474.09/4059.86)', () => {
    expect(corrigirParaBase('1000.00', 2014)).toBe('1594.66')
  })

  it('aceita number e string', () => {
    expect(corrigirParaBase(1000, 2022)).toBe('1000.00')
  })

  it('ano fora da série vendorada → null', () => {
    expect(corrigirParaBase('1000.00', 2010)).toBeNull()
    expect(corrigirParaBase('1000.00', 2026)).toBeNull()
  })

  it('valor inválido → null', () => {
    expect(corrigirParaBase('abc', 2018)).toBeNull()
  })
})

describe('fatorCorrecao', () => {
  it('reflete o número-índice de cada pleito', () => {
    expect(fatorCorrecao(2022)).toBe(1)
    expect(fatorCorrecao(2018)).toBeCloseTo(1.2693, 3)
    expect(fatorCorrecao(2014)).toBeCloseTo(1.5947, 3)
    expect(fatorCorrecao(2010)).toBeNull()
  })
})

describe('série vendorada', () => {
  it('contém os 3 pleitos cobertos e a base', () => {
    expect(Object.keys(IPCA_INDICE_DEZEMBRO).sort()).toEqual([
      '2014',
      '2018',
      '2022',
    ])
    expect(IPCA_INDICE_DEZEMBRO[IPCA_BASE_ANO]).toBe(6474.09)
  })
})
