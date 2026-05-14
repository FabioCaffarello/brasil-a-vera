import { describe, expect, it } from 'vitest'

import { escapeIlike, parseProposicaoRef } from './busca-parser'

describe('parseProposicaoRef', () => {
  it('detecta forma canônica PL 1234/2025', () => {
    expect(parseProposicaoRef('PL 1234/2025')).toEqual({
      tipo: 'PL',
      numero: 1234,
      ano: 2025,
    })
  })

  it('aceita lowercase e espaços extras', () => {
    expect(parseProposicaoRef('  pec 6 / 2017  ')).toEqual({
      tipo: 'PEC',
      numero: 6,
      ano: 2017,
    })
  })

  it('aceita todos os tipos cobertos', () => {
    for (const tipo of ['PL', 'PEC', 'PLP', 'MPV', 'PDC', 'PRC']) {
      expect(parseProposicaoRef(`${tipo} 1/2025`)?.tipo).toBe(tipo)
    }
  })

  it('retorna null para tipos fora do enum', () => {
    expect(parseProposicaoRef('REQ 1/2025')).toBeNull()
    expect(parseProposicaoRef('XYZ 1/2025')).toBeNull()
  })

  it('retorna null para formatos não-canônicos', () => {
    expect(parseProposicaoRef('PL-1234/2025')).toBeNull()
    expect(parseProposicaoRef('PL 1234')).toBeNull()
    expect(parseProposicaoRef('1234/2025')).toBeNull()
    expect(parseProposicaoRef('lula')).toBeNull()
    expect(parseProposicaoRef('')).toBeNull()
  })
})

describe('escapeIlike', () => {
  it('envolve com %% para match parcial', () => {
    expect(escapeIlike('lula')).toBe('%lula%')
  })

  it('escapa wildcards literais', () => {
    expect(escapeIlike('100%')).toBe('%100\\%%')
    expect(escapeIlike('a_b')).toBe('%a\\_b%')
    expect(escapeIlike('back\\slash')).toBe('%back\\\\slash%')
  })

  it('preserva acentos', () => {
    expect(escapeIlike('Saúde')).toBe('%Saúde%')
  })
})
