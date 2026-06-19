import { describe, expect, it } from 'vitest'

import { type ComissaoRaw, ehLideranca, shapeComissoes } from './comissoes-view'

function raw(over: Partial<ComissaoRaw>): ComissaoRaw {
  return {
    sigla: 'CCJC',
    nome: 'Comissão de Constituição e Justiça',
    cargoOrigem: null,
    tipoParticipacao: 'TITULAR',
    dataInicio: '2023-03-01',
    dataFim: null,
    ...over,
  }
}

describe('ehLideranca', () => {
  it('falso para null, vazio, Titular e Suplente', () => {
    expect(ehLideranca(null)).toBe(false)
    expect(ehLideranca('')).toBe(false)
    expect(ehLideranca('Titular')).toBe(false)
    expect(ehLideranca(' suplente ')).toBe(false)
  })

  it('verdadeiro para cargos de liderança', () => {
    expect(ehLideranca('Presidente')).toBe(true)
    expect(ehLideranca('1º Vice-Presidente')).toBe(true)
    expect(ehLideranca('Relator')).toBe(true)
  })
})

describe('shapeComissoes', () => {
  it('separa ativas (data_fim null) do histórico encerrado', () => {
    const view = shapeComissoes([
      raw({ sigla: 'CCJC', dataFim: null }),
      raw({ sigla: 'CVT', dataFim: '2024-06-05' }),
    ])
    expect(view.ativas.map((a) => a.sigla)).toEqual(['CCJC'])
    expect(view.totalHistoricas).toBe(1)
    expect(view.historicasSiglas).toEqual(['CVT'])
  })

  it('ordena ativas por liderança e depois por início desc', () => {
    const view = shapeComissoes([
      raw({ sigla: 'A', cargoOrigem: 'Titular', dataInicio: '2025-01-01' }),
      raw({ sigla: 'B', cargoOrigem: 'Presidente', dataInicio: '2023-01-01' }),
      raw({
        sigla: 'C',
        cargoOrigem: '1º Vice-Presidente',
        dataInicio: '2023-01-01',
      }),
      raw({ sigla: 'D', cargoOrigem: 'Relator', dataInicio: '2023-01-01' }),
      raw({
        sigla: 'E',
        cargoOrigem: 'Suplente',
        tipoParticipacao: 'SUPLENTE',
        dataInicio: '2026-01-01',
      }),
      raw({ sigla: 'F', cargoOrigem: 'Titular', dataInicio: '2024-01-01' }),
    ])
    // Presidente > Vice > Relator > Titular(desc por data) > Suplente
    expect(view.ativas.map((a) => a.sigla)).toEqual([
      'B',
      'C',
      'D',
      'A',
      'F',
      'E',
    ])
  })

  it('marca liderança e usa o cargo cru como rótulo; senão Titular/Suplente', () => {
    const view = shapeComissoes([
      raw({ sigla: 'P', cargoOrigem: 'Presidente' }),
      raw({ sigla: 'T', cargoOrigem: 'Titular', tipoParticipacao: 'TITULAR' }),
      raw({ sigla: 'S', cargoOrigem: null, tipoParticipacao: 'SUPLENTE' }),
    ])
    const byId = Object.fromEntries(view.ativas.map((a) => [a.sigla, a]))
    expect(byId.P).toMatchObject({ lideranca: true, cargo: 'Presidente' })
    expect(byId.T).toMatchObject({ lideranca: false, cargo: 'Titular' })
    expect(byId.S).toMatchObject({ lideranca: false, cargo: 'Suplente' })
  })

  it('dedup histórico por sigla e ordena alfabeticamente', () => {
    const view = shapeComissoes([
      raw({ sigla: 'CVT', dataInicio: '2023-09-05', dataFim: '2023-11-21' }),
      raw({ sigla: 'CVT', dataInicio: '2024-03-13', dataFim: '2024-06-05' }),
      raw({ sigla: 'CCJC', dataInicio: '2023-08-07', dataFim: '2023-11-21' }),
    ])
    expect(view.historicasSiglas).toEqual(['CCJC', 'CVT'])
    expect(view.totalHistoricas).toBe(2)
  })

  it('usa o nome quando a sigla é nula no histórico', () => {
    const view = shapeComissoes([
      raw({ sigla: null, nome: 'Comissão Externa X', dataFim: '2024-01-01' }),
    ])
    expect(view.historicasSiglas).toEqual(['Comissão Externa X'])
  })

  it('entrada vazia → view vazia', () => {
    expect(shapeComissoes([])).toEqual({
      ativas: [],
      historicasSiglas: [],
      totalHistoricas: 0,
    })
  })
})
