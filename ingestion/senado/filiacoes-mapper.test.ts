import { describe, expect, it } from 'vitest'

import { mapFiliacoesSenado } from './filiacoes-mapper'

describe('mapFiliacoesSenado', () => {
  it('mapeia períodos prontos (DataFiliacao/DataDesfiliacao)', () => {
    const r = mapFiliacoesSenado([
      {
        Partido: { SiglaPartido: 'REPUBLICANOS' },
        DataFiliacao: '2025-11-12',
      },
      {
        Partido: { SiglaPartido: 'UNIÃO' },
        DataFiliacao: '2022-02-24',
        DataDesfiliacao: '2025-11-10',
      },
    ])
    expect(r).toEqual([
      { partidoSigla: 'REPUBLICANOS', dataInicio: '2025-11-12', dataFim: null },
      {
        partidoSigla: 'UNIÃO',
        dataInicio: '2022-02-24',
        dataFim: '2025-11-10',
      },
    ])
  })

  it('ignora filiação sem sigla ou sem data de início', () => {
    const r = mapFiliacoesSenado([
      { Partido: { SiglaPartido: '' }, DataFiliacao: '2020-01-01' },
      // @ts-expect-error data faltando — defensivo
      { Partido: { SiglaPartido: 'PT' }, DataFiliacao: '' },
      { Partido: { SiglaPartido: 'PSD' }, DataFiliacao: '2019-01-01' },
    ])
    expect(r).toEqual([
      { partidoSigla: 'PSD', dataInicio: '2019-01-01', dataFim: null },
    ])
  })

  it('vazio → []', () => {
    expect(mapFiliacoesSenado([])).toEqual([])
  })
})
