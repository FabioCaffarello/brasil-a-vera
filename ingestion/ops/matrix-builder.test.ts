import { describe, expect, it } from 'vitest'

import type { IngestionSource } from '../registry'
import { SOURCES } from '../registry'
import { buildTierMatrices } from './matrix-builder'

describe('buildTierMatrices', () => {
  it('agrupa daily em 3 tiers preservando o DAG (votações consolidadas)', () => {
    const tiers = buildTierMatrices(SOURCES, 'daily')
    expect(tiers).toHaveLength(3)
    expect(tiers[0].map((e) => e.id).sort()).toEqual([
      'camara-deputados',
      'camara-votacoes',
      'senado-votacoes',
    ])
    expect(tiers[1].map((e) => e.id).sort()).toEqual([
      'camara-orientacoes',
      'camara-proposicoes',
      'senado-senadores',
    ])
    expect(tiers[2].map((e) => e.id).sort()).toEqual([
      'camara-backfill-votacao-proposicao',
      'senado-proposicoes',
    ])
  })

  it('weekly é um único tier de jobs independentes', () => {
    const tiers = buildTierMatrices(SOURCES, 'weekly')
    expect(tiers).toHaveLength(1)
    expect(tiers[0]).toHaveLength(3)
  })

  it('cadência sem entradas (monthly hoje) retorna []', () => {
    expect(buildTierMatrices(SOURCES, 'monthly')).toEqual([])
  })

  it('cada entrada expõe só os campos que a matrix consome', () => {
    const [entry] = buildTierMatrices(SOURCES, 'weekly')[0]
    expect(Object.keys(entry).sort()).toEqual([
      'context',
      'id',
      'script',
      'timeoutMin',
    ])
  })

  it('respeita um registry sintético arbitrário', () => {
    const fake: IngestionSource[] = [
      {
        id: 'a',
        script: 's:a',
        context: 'c-a',
        cadence: 'weekly',
        tier: 0,
        timeoutMin: 5,
      },
      {
        id: 'b',
        script: 's:b',
        context: 'c-b',
        cadence: 'weekly',
        tier: 1,
        timeoutMin: 5,
      },
      {
        id: 'c',
        script: 's:c',
        context: 'c-c',
        cadence: 'daily',
        tier: 0,
        timeoutMin: 5,
      },
    ]
    const tiers = buildTierMatrices(fake, 'weekly')
    expect(tiers).toHaveLength(2)
    expect(tiers[0].map((e) => e.id)).toEqual(['a'])
    expect(tiers[1].map((e) => e.id)).toEqual(['b'])
  })
})
