import { describe, expect, it } from 'vitest'

import { agregarDistribuicaoAutoria } from './relatorias'

describe('agregarDistribuicaoAutoria', () => {
  it('conta por partido e ordena do maior para o menor', () => {
    const r = agregarDistribuicaoAutoria(['PL', 'PT', 'PL', 'PL', 'PT', 'NOVO'])
    expect(r.total).toBe(6)
    expect(r.distribuicao).toEqual([
      { partido: 'PL', count: 3, pct: 50 },
      { partido: 'PT', count: 2, pct: 33 },
      { partido: 'NOVO', count: 1, pct: 17 },
    ])
  })

  it('desempata por ordem alfabética', () => {
    const r = agregarDistribuicaoAutoria(['PSB', 'MDB'])
    expect(r.distribuicao.map((d) => d.partido)).toEqual(['MDB', 'PSB'])
  })

  it('lista vazia → total 0, distribuição vazia', () => {
    expect(agregarDistribuicaoAutoria([])).toEqual({
      total: 0,
      distribuicao: [],
    })
  })
})
