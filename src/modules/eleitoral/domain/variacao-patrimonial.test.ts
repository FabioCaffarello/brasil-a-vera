import { describe, expect, it } from 'vitest'

import { corrigirParaBase } from './ipca'
import {
  type BemPorPleito,
  calcularVariacaoRanking,
} from './variacao-patrimonial'

function bem(
  parlamentarId: string,
  anoEleicao: number,
  totalNominal: string,
  casa: 'CAMARA' | 'SENADO' = 'CAMARA',
): BemPorPleito {
  return { parlamentarId, casa, anoEleicao, totalNominal }
}

describe('calcularVariacaoRanking', () => {
  it('< 2 pleitos → parlamentar fora do confronto (fail-closed)', () => {
    const r = calcularVariacaoRanking([bem('p1', 2022, '100000')])
    expect(r.has('p1')).toBe(false)
  })

  it('usa o último par de pleitos consecutivos quando há 3', () => {
    const r = calcularVariacaoRanking([
      bem('p1', 2014, '10000'),
      bem('p1', 2018, '20000'),
      bem('p1', 2022, '30000'),
    ])
    const v = r.get('p1')
    expect(v?.pleitoDe).toBe(2018)
    expect(v?.pleitoAte).toBe(2022)
  })

  it('delta real = corrigido(ate) − corrigido(de); nominal flat = declínio real', () => {
    const r = calcularVariacaoRanking([
      bem('p1', 2018, '100000'),
      bem('p1', 2022, '100000'),
    ])
    const v = r.get('p1')
    const realDe = Number(corrigirParaBase('100000', 2018))
    const realAte = Number(corrigirParaBase('100000', 2022))
    expect(v?.deltaRealAbs).toBe((realAte - realDe).toFixed(2))
    // 2022 é base; 100k de 2018 em preços de 2022 vale mais → delta negativo.
    expect(Number(v?.deltaRealAbs)).toBeLessThan(0)
  })

  it('percentil rankeia pelo delta real absoluto entre pares (mesma casa/par)', () => {
    const r = calcularVariacaoRanking([
      bem('alta', 2018, '50000'),
      bem('alta', 2022, '200000'), // maior crescimento real
      bem('media', 2018, '100000'),
      bem('media', 2022, '120000'),
      bem('baixa', 2018, '100000'),
      bem('baixa', 2022, '100000'), // declínio real (flat nominal)
    ])
    expect(r.get('alta')?.percentil).toBe(100)
    expect(r.get('media')?.percentil).toBe(50)
    expect(r.get('baixa')?.percentil).toBe(0)
    expect(r.get('alta')?.nPares).toBe(3)
  })

  it('grupos separados por casa e por par de pleitos (sem cross-ranking)', () => {
    const r = calcularVariacaoRanking([
      bem('cam', 2018, '100000', 'CAMARA'),
      bem('cam', 2022, '200000', 'CAMARA'),
      bem('sen', 2018, '100000', 'SENADO'),
      bem('sen', 2022, '200000', 'SENADO'),
    ])
    // Cada um é o único do seu grupo → sem pares → percentil null.
    expect(r.get('cam')?.percentil).toBeNull()
    expect(r.get('cam')?.nPares).toBe(1)
    expect(r.get('sen')?.percentil).toBeNull()
  })

  it('deltaPct null quando base real é 0', () => {
    const r = calcularVariacaoRanking([
      bem('p1', 2018, '0'),
      bem('p1', 2022, '50000'),
    ])
    expect(r.get('p1')?.deltaPct).toBeNull()
  })
})
