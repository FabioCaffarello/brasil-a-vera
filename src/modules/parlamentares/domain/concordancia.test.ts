import { describe, expect, it } from 'vitest'

import {
  CONCORDANCIA_AMOSTRA_MINIMA,
  calcularConcordancias,
  type VotoParlamentar,
} from './concordancia'

function make(...votos: VotoParlamentar[]): VotoParlamentar[] {
  return votos
}

describe('calcularConcordancias', () => {
  it('lista vazia retorna array vazio', () => {
    expect(calcularConcordancias(new Map())).toEqual([])
  })

  it('1 parlamentar retorna array vazio (sem pares possíveis)', () => {
    const m = new Map([['p1', make({ votacaoId: 'v1', voto: 'SIM' })]])
    expect(calcularConcordancias(m)).toEqual([])
  })

  it('2 parlamentares produz 1 par; 3 produz 3 pares', () => {
    const m2 = new Map([
      ['a', make({ votacaoId: 'v1', voto: 'SIM' })],
      ['b', make({ votacaoId: 'v1', voto: 'SIM' })],
    ])
    expect(calcularConcordancias(m2)).toHaveLength(1)

    const m3 = new Map([
      ['a', make({ votacaoId: 'v1', voto: 'SIM' })],
      ['b', make({ votacaoId: 'v1', voto: 'SIM' })],
      ['c', make({ votacaoId: 'v1', voto: 'SIM' })],
    ])
    expect(calcularConcordancias(m3)).toHaveLength(3)
  })

  it('pares ordenados por id asc (consistência)', () => {
    const m = new Map([
      ['c', make({ votacaoId: 'v1', voto: 'SIM' })],
      ['a', make({ votacaoId: 'v1', voto: 'SIM' })],
      ['b', make({ votacaoId: 'v1', voto: 'SIM' })],
    ])
    const result = calcularConcordancias(m)
    expect(result.map((p) => `${p.parlamentarA}-${p.parlamentarB}`)).toEqual([
      'a-b',
      'a-c',
      'b-c',
    ])
  })

  it('amostra menor que mínimo → percentual null', () => {
    const m = new Map([
      ['a', make({ votacaoId: 'v1', voto: 'SIM' })],
      ['b', make({ votacaoId: 'v1', voto: 'SIM' })],
    ])
    const [par] = calcularConcordancias(m)
    expect(par.total).toBe(1)
    expect(par.coincidentes).toBe(1)
    expect(par.percentual).toBeNull()
  })

  it('5 votações coincidentes → 100%', () => {
    const votacoes = ['v1', 'v2', 'v3', 'v4', 'v5']
    const m = new Map([
      ['a', votacoes.map((v) => ({ votacaoId: v, voto: 'SIM' as const }))],
      ['b', votacoes.map((v) => ({ votacaoId: v, voto: 'SIM' as const }))],
    ])
    const [par] = calcularConcordancias(m)
    expect(par.total).toBe(5)
    expect(par.coincidentes).toBe(5)
    expect(par.percentual).toBe(100)
  })

  it('5 votações divergentes → 0%', () => {
    const votacoes = ['v1', 'v2', 'v3', 'v4', 'v5']
    const m = new Map([
      ['a', votacoes.map((v) => ({ votacaoId: v, voto: 'SIM' as const }))],
      ['b', votacoes.map((v) => ({ votacaoId: v, voto: 'NAO' as const }))],
    ])
    const [par] = calcularConcordancias(m)
    expect(par.percentual).toBe(0)
  })

  it('ignora AUSENTE em qualquer lado do par', () => {
    const m = new Map([
      [
        'a',
        make(
          { votacaoId: 'v1', voto: 'SIM' },
          { votacaoId: 'v2', voto: 'AUSENTE' },
          { votacaoId: 'v3', voto: 'SIM' },
        ),
      ],
      [
        'b',
        make(
          { votacaoId: 'v1', voto: 'SIM' },
          { votacaoId: 'v2', voto: 'SIM' },
          { votacaoId: 'v3', voto: 'AUSENTE' },
        ),
      ],
    ])
    const [par] = calcularConcordancias(m)
    // Só v1 conta (ambos não-AUSENTE)
    expect(par.total).toBe(1)
    expect(par.coincidentes).toBe(1)
  })

  it('ignora votações sem voto em um dos lados', () => {
    const m = new Map([
      [
        'a',
        make(
          { votacaoId: 'v1', voto: 'SIM' },
          { votacaoId: 'v2', voto: 'SIM' },
        ),
      ],
      // b só votou em v1
      ['b', make({ votacaoId: 'v1', voto: 'SIM' })],
    ])
    const [par] = calcularConcordancias(m)
    expect(par.total).toBe(1) // v2 ignorada porque b não votou
  })

  it('AMOSTRA_MINIMA = 5', () => {
    expect(CONCORDANCIA_AMOSTRA_MINIMA).toBe(5)
  })
})
