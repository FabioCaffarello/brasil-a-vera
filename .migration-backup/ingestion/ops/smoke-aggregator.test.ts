import { describe, expect, it } from 'vitest'

import { aggregateProbeResults } from './smoke-aggregator'

describe('aggregateProbeResults', () => {
  it('retorna 100% quando todos os statuses estão na lista esperada', () => {
    const r = aggregateProbeResults('p', [200, 200, 200], [200])
    expect(r.total).toBe(3)
    expect(r.expected).toBe(3)
    expect(r.unexpected).toBe(0)
    expect(r.errors).toBe(0)
    expect(r.successRate).toBe(100)
    expect(r.statuses).toEqual({ '200': 3 })
  })

  it('retorna 0% quando todos os statuses estão fora da lista esperada', () => {
    const r = aggregateProbeResults('p', [500, 502, 503], [200])
    expect(r.successRate).toBe(0)
    expect(r.expected).toBe(0)
    expect(r.unexpected).toBe(3)
    expect(r.errors).toBe(0)
  })

  it('calcula taxa fracionária com mix de expected e unexpected', () => {
    const r = aggregateProbeResults('p', [200, 200, 200, 500], [200])
    expect(r.total).toBe(4)
    expect(r.expected).toBe(3)
    expect(r.unexpected).toBe(1)
    expect(r.successRate).toBe(75)
  })

  it('aceita múltiplos statuses esperados (ex: 401 ou 503 para auth path)', () => {
    const r = aggregateProbeResults('p', [401, 401, 503], [401, 503])
    expect(r.successRate).toBe(100)
    expect(r.unexpected).toBe(0)
  })

  it('conta status -1 como erro de rede, separado de unexpected', () => {
    const r = aggregateProbeResults('p', [200, 200, -1], [200])
    expect(r.errors).toBe(1)
    expect(r.expected).toBe(2)
    expect(r.unexpected).toBe(0)
    expect(r.successRate).toBeCloseTo(66.67, 1)
    expect(r.statuses).toEqual({ '200': 2, error: 1 })
  })

  it('retorna successRate 0 para entrada vazia, sem dividir por zero', () => {
    const r = aggregateProbeResults('p', [], [200])
    expect(r.total).toBe(0)
    expect(r.successRate).toBe(0)
  })
})
