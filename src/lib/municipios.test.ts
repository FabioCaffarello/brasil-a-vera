import { describe, expect, it } from 'vitest'

import {
  findMunicipio,
  getMunicipiosByUf,
  isUf,
  nomeUfCompleto,
  UFS,
} from './municipios'

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

describe('getMunicipiosByUf', () => {
  it('retorna municípios de SP em ordem alfabética', () => {
    const sp = getMunicipiosByUf('SP')
    expect(sp.length).toBeGreaterThan(600) // SP tem 645 municípios
    expect(sp[0]?.uf).toBe('SP')
    // Ordenação alfabética PT-BR
    const nomes = sp.map((m) => m.nome)
    const sorted = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    expect(nomes).toEqual(sorted)
  })

  it('DF tem 1 município (Brasília)', () => {
    const df = getMunicipiosByUf('DF')
    expect(df).toHaveLength(1)
    expect(df[0]?.nome).toBe('Brasília')
  })

  it('retorna array vazio para UF sem municípios (defensivo)', () => {
    // Não deve acontecer com dataset IBGE — UFs sempre têm municípios.
    // Mas tipagem permite UF qualquer; cast forçado simula corrupção.
    const fake = getMunicipiosByUf('ZZ' as never)
    expect(fake).toEqual([])
  })
})

describe('findMunicipio', () => {
  it('encontra município exato', () => {
    const m = findMunicipio('SP', 'São Paulo')
    expect(m?.nome).toBe('São Paulo')
    expect(m?.uf).toBe('SP')
  })

  it('é case-insensitive', () => {
    expect(findMunicipio('SP', 'são paulo')?.nome).toBe('São Paulo')
    expect(findMunicipio('SP', 'SÃO PAULO')?.nome).toBe('São Paulo')
  })

  it('é acent-insensitive', () => {
    expect(findMunicipio('SP', 'sao paulo')?.nome).toBe('São Paulo')
    expect(findMunicipio('GO', 'goiania')?.nome).toBe('Goiânia')
  })

  it('tolera whitespace nas pontas', () => {
    expect(findMunicipio('SP', '  São Paulo  ')?.nome).toBe('São Paulo')
  })

  it('retorna null quando município não existe na UF', () => {
    expect(findMunicipio('SP', 'Brasília')).toBeNull()
    expect(findMunicipio('SP', 'xyz inexistente')).toBeNull()
  })

  it('rejeita match parcial (precisa ser nome completo)', () => {
    // "Ribeirão" não casa com "Ribeirão Preto" — exige nome completo.
    expect(findMunicipio('SP', 'Ribeirão')).toBeNull()
  })
})
