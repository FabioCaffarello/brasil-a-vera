import { describe, expect, it } from 'vitest'

import type { EvolucaoPatrimonial, PleitoPonto } from './evolucao'
import { buildMixComposicao } from './mix'

function ponto(
  ano: number,
  cats: Array<[number, string, string]>,
): PleitoPonto {
  const categorias = cats.map(([cdTipoBem, dsTipoBem, totalNominal]) => ({
    cdTipoBem,
    dsTipoBem,
    totalNominal,
    totalCorrigido: totalNominal,
  }))
  return {
    ano,
    totalNominal: '0',
    totalCorrigido: '0',
    nBens: cats.length,
    categorias,
  }
}

function evo(pontos: PleitoPonto[]): EvolucaoPatrimonial {
  return { baseAno: 2022, pontos, deltas: [] }
}

describe('buildMixComposicao', () => {
  it('null com < 2 pleitos', () => {
    expect(buildMixComposicao(null)).toBeNull()
    expect(
      buildMixComposicao(evo([ponto(2022, [[12, 'Casa', '100']])])),
    ).toBeNull()
  })

  it('mix % é share intra-ano (imune à inflação) e mostra o shift', () => {
    // 2018: 70% imóvel, 30% empresa. 2022: 40% imóvel, 60% empresa.
    const mix = buildMixComposicao(
      evo([
        ponto(2018, [
          [12, 'Casa', '700'],
          [32, 'Quotas', '300'],
        ]),
        ponto(2022, [
          [12, 'Casa', '400'],
          [32, 'Quotas', '600'],
        ]),
      ]),
    )
    const p2018 = mix?.pleitos.find((p) => p.ano === 2018)
    const p2022 = mix?.pleitos.find((p) => p.ano === 2022)
    expect(p2018?.segmentos.find((s) => s.cdTipoBem === 12)?.pct).toBe(70)
    expect(p2018?.segmentos.find((s) => s.cdTipoBem === 32)?.pct).toBe(30)
    expect(p2022?.segmentos.find((s) => s.cdTipoBem === 12)?.pct).toBe(40)
    expect(p2022?.segmentos.find((s) => s.cdTipoBem === 32)?.pct).toBe(60)
  })

  it('cor estável por categoria entre pleitos (ranking por maior participação)', () => {
    const mix = buildMixComposicao(
      evo([
        ponto(2018, [
          [12, 'Casa', '700'],
          [32, 'Quotas', '300'],
        ]),
        ponto(2022, [
          [12, 'Casa', '400'],
          [32, 'Quotas', '600'],
        ]),
      ]),
    )
    // Maior participação: Casa 70% (2018) > Quotas 60% (2022) → Casa corIdx 1,
    // Quotas corIdx 2. Estável entre os pleitos (mostra a migração).
    expect(mix?.legenda.find((l) => l.label === 'Casa')?.corIdx).toBe(1)
    expect(mix?.legenda.find((l) => l.label === 'Quotas')?.corIdx).toBe(2)
    for (const p of mix?.pleitos ?? []) {
      expect(p.segmentos.find((s) => s.cdTipoBem === 12)?.corIdx).toBe(1)
      expect(p.segmentos.find((s) => s.cdTipoBem === 32)?.corIdx).toBe(2)
    }
  })

  it('agrega o excedente do top 5 em "Outras"', () => {
    const cats: Array<[number, string, string]> = [
      [1, 'A', '100'],
      [2, 'B', '100'],
      [3, 'C', '100'],
      [4, 'D', '100'],
      [5, 'E', '100'],
      [6, 'F', '100'],
      [7, 'G', '100'],
    ]
    const mix = buildMixComposicao(evo([ponto(2018, cats), ponto(2022, cats)]))
    const p = mix?.pleitos[0]
    const outras = p?.segmentos.find((s) => s.cdTipoBem === null)
    // 7 categorias iguais (~14,3% cada); top 5 = ~71,5%; outras ≈ 28,6%.
    expect(outras?.label).toBe('Outras')
    expect(outras?.corIdx).toBe(0)
    expect(mix?.legenda.some((l) => l.label === 'Outras')).toBe(true)
  })
})
