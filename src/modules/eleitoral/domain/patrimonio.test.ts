import { describe, expect, it } from 'vitest'

import { aggregatePatrimonio, type PatrimonioCategoriaRow } from './patrimonio'

const SRC = 'https://cdn.tse.jus.br/.../bem_candidato_2022.zip'

function row(over: Partial<PatrimonioCategoriaRow>): PatrimonioCategoriaRow {
  return {
    cdTipoBem: 1,
    dsTipoBem: 'Bem',
    total: '0.00',
    n: 1,
    ultDt: null,
    sourceUrl: SRC,
    ...over,
  }
}

describe('aggregatePatrimonio', () => {
  it('retorna null sem linhas (não-vinculado / sem bens)', () => {
    expect(aggregatePatrimonio([], 2022)).toBeNull()
  })

  it('soma total, calcula % e ordena por valor desc', () => {
    const snap = aggregatePatrimonio(
      [
        row({ cdTipoBem: 12, dsTipoBem: 'Casa', total: '750000.00', n: 1 }),
        row({ cdTipoBem: 21, dsTipoBem: 'Veículo', total: '250000.00', n: 2 }),
      ],
      2022,
    )
    expect(snap).not.toBeNull()
    expect(snap?.total).toBe('1000000.00')
    expect(snap?.nBens).toBe(3)
    expect(snap?.categorias.map((c) => c.dsTipoBem)).toEqual([
      'Casa',
      'Veículo',
    ])
    expect(snap?.categorias[0]?.pct).toBe(75)
    expect(snap?.categorias[1]?.pct).toBe(25)
  })

  it('soma em centavos sem erro de ponto flutuante', () => {
    const snap = aggregatePatrimonio(
      [
        row({ cdTipoBem: 1, total: '0.10', n: 1 }),
        row({ cdTipoBem: 2, total: '0.20', n: 1 }),
      ],
      2022,
    )
    expect(snap?.total).toBe('0.30')
  })

  it('pct com uma casa decimal (1/3)', () => {
    const snap = aggregatePatrimonio(
      [
        row({ cdTipoBem: 1, total: '100.00', n: 1 }),
        row({ cdTipoBem: 2, total: '100.00', n: 1 }),
        row({ cdTipoBem: 3, total: '100.00', n: 1 }),
      ],
      2022,
    )
    expect(snap?.categorias.every((c) => c.pct === 33.3)).toBe(true)
  })

  it('dtUltAtualizacao é o MAX entre categorias, ignorando null', () => {
    const snap = aggregatePatrimonio(
      [
        row({ cdTipoBem: 1, total: '10.00', ultDt: '2022-12-14' }),
        row({ cdTipoBem: 2, total: '20.00', ultDt: '2023-10-25' }),
        row({ cdTipoBem: 3, total: '30.00', ultDt: null }),
      ],
      2022,
    )
    expect(snap?.dtUltAtualizacao).toBe('2023-10-25')
  })
})
