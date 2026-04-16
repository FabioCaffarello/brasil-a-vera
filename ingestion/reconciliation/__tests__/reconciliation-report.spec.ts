import { describe, expect, it } from 'vitest'
import { finalizeReport, newReport } from '../reconciliation-report'

describe('ReconciliationReport', () => {
  it('soma gaps + orphans + stale em divergenceCount', () => {
    const r = newReport('test')
    r.gaps.push({ idExterno: '1' })
    r.orphans.push({ idExterno: '2' }, { idExterno: '3' })
    r.stale.push({ idExterno: '4', field: 'uf', official: 'SP', local: 'RJ' })
    finalizeReport(r)
    expect(r.divergenceCount).toBe(4)
  })

  it('calcula okCount baseado em min(officialCount, localCount) menos stale', () => {
    const r = newReport('test')
    r.officialCount = 100
    r.localCount = 95
    r.stale.push({ idExterno: '1', field: 'uf', official: 'SP', local: 'RJ' })
    finalizeReport(r)
    expect(r.okCount).toBe(94) // min(100, 95) - 1 stale
  })

  it('okCount nunca é negativo', () => {
    const r = newReport('test')
    r.officialCount = 10
    r.localCount = 5
    r.stale.push(
      { idExterno: '1', field: 'uf', official: 'SP', local: 'RJ' },
      { idExterno: '2', field: 'uf', official: 'SP', local: 'RJ' },
      { idExterno: '3', field: 'uf', official: 'SP', local: 'RJ' },
      { idExterno: '4', field: 'uf', official: 'SP', local: 'RJ' },
      { idExterno: '5', field: 'uf', official: 'SP', local: 'RJ' },
      { idExterno: '6', field: 'uf', official: 'SP', local: 'RJ' },
    )
    finalizeReport(r)
    expect(r.okCount).toBe(0) // não pode ser -1
  })

  it('finaliza timestamp corretamente', () => {
    const r = newReport('test')
    const startedAt = r.startedAt
    finalizeReport(r)
    expect(r.finishedAt.getTime()).toBeGreaterThanOrEqual(startedAt.getTime())
  })
})
