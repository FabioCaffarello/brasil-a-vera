import { describe, expect, it } from 'vitest'

import {
  parseAlertasSubtab,
  parseParlamentaresSubtab,
  parseTab,
  TAB_KEYS,
} from './painel-tabs'

describe('parseTab', () => {
  it('retorna o tab quando string válida', () => {
    expect(parseTab('resumo')).toBe('resumo')
    expect(parseTab('parlamentares')).toBe('parlamentares')
    expect(parseTab('alertas')).toBe('alertas')
    expect(parseTab('configuracoes')).toBe('configuracoes')
    expect(parseTab('meus-dados')).toBe('meus-dados')
  })

  it('cai em "resumo" para string desconhecida', () => {
    expect(parseTab('xpto')).toBe('resumo')
    expect(parseTab('')).toBe('resumo')
  })

  it('cai em "resumo" para undefined / null', () => {
    expect(parseTab(undefined)).toBe('resumo')
    expect(parseTab(null)).toBe('resumo')
  })

  it('cai em "resumo" para array (múltiplos `?tab=`)', () => {
    expect(parseTab(['parlamentares', 'alertas'])).toBe('resumo')
  })

  it('TAB_KEYS exporta 5 entradas em ordem (resumo é primeiro = default)', () => {
    expect(TAB_KEYS).toEqual([
      'resumo',
      'parlamentares',
      'alertas',
      'configuracoes',
      'meus-dados',
    ])
  })
})

describe('parseParlamentaresSubtab', () => {
  it('retorna subtab válido', () => {
    expect(parseParlamentaresSubtab('acompanhando')).toBe('acompanhando')
    expect(parseParlamentaresSubtab('da-minha-uf')).toBe('da-minha-uf')
  })

  it('retorna null para subtab desconhecido', () => {
    expect(parseParlamentaresSubtab('xpto')).toBeNull()
    expect(parseParlamentaresSubtab('politicas')).toBeNull() // valid em outra tab
  })

  it('retorna null para undefined / null / array', () => {
    expect(parseParlamentaresSubtab(undefined)).toBeNull()
    expect(parseParlamentaresSubtab(null)).toBeNull()
    expect(parseParlamentaresSubtab(['acompanhando'])).toBeNull()
  })
})

describe('parseAlertasSubtab', () => {
  it('retorna subtab válido', () => {
    expect(parseAlertasSubtab('recebidos')).toBe('recebidos')
    expect(parseAlertasSubtab('politicas')).toBe('politicas')
  })

  it('retorna null para subtab desconhecido', () => {
    expect(parseAlertasSubtab('xpto')).toBeNull()
    expect(parseAlertasSubtab('acompanhando')).toBeNull() // valid em outra tab
  })

  it('retorna null para undefined / null / array', () => {
    expect(parseAlertasSubtab(undefined)).toBeNull()
    expect(parseAlertasSubtab(null)).toBeNull()
    expect(parseAlertasSubtab(['politicas'])).toBeNull()
  })
})
