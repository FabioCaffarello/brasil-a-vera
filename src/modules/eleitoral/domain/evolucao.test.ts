import { describe, expect, it } from 'vitest'

import { buildEvolucao, type EvolucaoRow } from './evolucao'

function row(over: Partial<EvolucaoRow>): EvolucaoRow {
  return {
    anoEleicao: 2022,
    cdTipoBem: 12,
    dsTipoBem: 'Casa',
    total: '0.00',
    n: 1,
    ...over,
  }
}

describe('buildEvolucao', () => {
  it('null com menos de 2 pleitos (1 ponto não é evolução)', () => {
    expect(buildEvolucao([])).toBeNull()
    expect(
      buildEvolucao([row({ anoEleicao: 2022, total: '100.00' })]),
    ).toBeNull()
  })

  it('monta pontos ordenados por ano com nominal + corrigido', () => {
    const ev = buildEvolucao([
      row({ anoEleicao: 2018, cdTipoBem: 12, total: '1000.00', n: 1 }),
      row({ anoEleicao: 2022, cdTipoBem: 12, total: '1000.00', n: 1 }),
    ])
    expect(ev).not.toBeNull()
    expect(ev?.pontos.map((p) => p.ano)).toEqual([2018, 2022])
    // 2022 = base → corrigido == nominal
    expect(ev?.pontos[1]?.totalCorrigido).toBe('1000.00')
    // 2018 → ×(6474.09/5100.61) = 1269.28
    expect(ev?.pontos[0]?.totalCorrigido).toBe('1269.28')
  })

  it('soma categorias no total do pleito', () => {
    const ev = buildEvolucao([
      row({ anoEleicao: 2018, cdTipoBem: 12, total: '600.00', n: 1 }),
      row({ anoEleicao: 2018, cdTipoBem: 21, total: '400.00', n: 2 }),
      row({ anoEleicao: 2022, cdTipoBem: 12, total: '999.99', n: 1 }),
    ])
    const p2018 = ev?.pontos.find((p) => p.ano === 2018)
    expect(p2018?.totalNominal).toBe('1000.00')
    expect(p2018?.nBens).toBe(3)
    expect(p2018?.categorias).toHaveLength(2)
  })

  it('delta entre pleitos consecutivos usa o corrigido', () => {
    // 2018: 1000 nominal → 1269.28 corrigido. 2022: 1269.28 nominal → 1269.28.
    // delta corrigido ≈ 0 (mesmo poder de compra).
    const ev = buildEvolucao([
      row({ anoEleicao: 2018, total: '1000.00', n: 1 }),
      row({ anoEleicao: 2022, total: '1269.28', n: 1 }),
    ])
    expect(ev?.deltas).toHaveLength(1)
    expect(ev?.deltas[0]).toMatchObject({ de: 2018, para: 2022 })
    expect(ev?.deltas[0]?.deltaCorrigido).toBe('0.00')
    expect(ev?.deltas[0]?.deltaPct).toBe(0)
  })

  it('3 pleitos → 2 deltas consecutivos (sem interpolar lacuna)', () => {
    const ev = buildEvolucao([
      row({ anoEleicao: 2014, total: '100.00', n: 1 }),
      row({ anoEleicao: 2018, total: '100.00', n: 1 }),
      row({ anoEleicao: 2022, total: '100.00', n: 1 }),
    ])
    expect(ev?.pontos).toHaveLength(3)
    expect(ev?.deltas.map((d) => [d.de, d.para])).toEqual([
      [2014, 2018],
      [2018, 2022],
    ])
  })

  it('só dois pleitos não-adjacentes (2014, 2022) → 1 delta direto, sem inventar 2018', () => {
    const ev = buildEvolucao([
      row({ anoEleicao: 2014, total: '100.00', n: 1 }),
      row({ anoEleicao: 2022, total: '100.00', n: 1 }),
    ])
    expect(ev?.pontos.map((p) => p.ano)).toEqual([2014, 2022])
    expect(ev?.deltas).toHaveLength(1)
    expect(ev?.deltas[0]).toMatchObject({ de: 2014, para: 2022 })
  })
})
