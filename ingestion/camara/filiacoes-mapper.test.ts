import { describe, expect, it } from 'vitest'

import { collapseHistoricoToFiliacoes } from './filiacoes-mapper'

describe('collapseHistoricoToFiliacoes', () => {
  it('colapsa eventos consecutivos do mesmo partido num período', () => {
    const r = collapseHistoricoToFiliacoes([
      { dataHora: '2023-02-01T00:00', siglaPartido: 'REPUBLICANOS' },
      { dataHora: '2023-02-01T12:05', siglaPartido: 'REPUBLICANOS' },
      { dataHora: '2024-04-16T20:57', siglaPartido: 'MDB' },
    ])
    expect(r).toEqual([
      {
        partidoSigla: 'REPUBLICANOS',
        dataInicio: '2023-02-01',
        dataFim: '2024-04-16',
      },
      { partidoSigla: 'MDB', dataInicio: '2024-04-16', dataFim: null },
    ])
  })

  it('ordena por dataHora antes de colapsar', () => {
    const r = collapseHistoricoToFiliacoes([
      { dataHora: '2024-04-16T20:57', siglaPartido: 'MDB' },
      { dataHora: '2023-02-01T00:00', siglaPartido: 'PL' },
    ])
    expect(r.map((p) => p.partidoSigla)).toEqual(['PL', 'MDB'])
    expect(r[0].dataInicio).toBe('2023-02-01')
  })

  it('trata A→B→A como três períodos distintos', () => {
    const r = collapseHistoricoToFiliacoes([
      { dataHora: '2020-01-01T00:00', siglaPartido: 'A' },
      { dataHora: '2021-01-01T00:00', siglaPartido: 'B' },
      { dataHora: '2022-01-01T00:00', siglaPartido: 'A' },
    ])
    expect(r).toEqual([
      { partidoSigla: 'A', dataInicio: '2020-01-01', dataFim: '2021-01-01' },
      { partidoSigla: 'B', dataInicio: '2021-01-01', dataFim: '2022-01-01' },
      { partidoSigla: 'A', dataInicio: '2022-01-01', dataFim: null },
    ])
  })

  it('ignora eventos sem partido', () => {
    const r = collapseHistoricoToFiliacoes([
      { dataHora: '2023-01-01T00:00', siglaPartido: null },
      { dataHora: '2023-02-01T00:00', siglaPartido: 'PT' },
      { dataHora: '2023-03-01T00:00', siglaPartido: '' },
    ])
    expect(r).toEqual([
      { partidoSigla: 'PT', dataInicio: '2023-02-01', dataFim: null },
    ])
  })

  it('vazio → []', () => {
    expect(collapseHistoricoToFiliacoes([])).toEqual([])
  })
})
