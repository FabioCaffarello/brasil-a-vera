import { describe, expect, it } from 'vitest'

import type { IngestionSource } from '../registry'
import { SOURCES } from '../registry'
import { buildTierMatrices } from './matrix-builder'

describe('buildTierMatrices', () => {
  it('agrupa daily em 4 tiers preservando o DAG (votações consolidadas)', () => {
    const tiers = buildTierMatrices(SOURCES, 'daily')
    expect(tiers).toHaveLength(4)
    expect(tiers[0].map((e) => e.id).sort()).toEqual([
      'camara-deputados',
      'camara-votacoes',
      'senado-votacoes',
    ])
    expect(tiers[1].map((e) => e.id).sort()).toEqual([
      'camara-orientacoes',
      'camara-proposicoes',
      'senado-orientacoes',
      'senado-senadores',
    ])
    expect(tiers[2].map((e) => e.id).sort()).toEqual([
      'camara-backfill-votacao-proposicao',
      'senado-proposicoes',
    ])
    expect(tiers[3].map((e) => e.id).sort()).toEqual([
      'senado-backfill-votacao-proposicao',
    ])
  })

  it('weekly é um único tier de jobs independentes', () => {
    const tiers = buildTierMatrices(SOURCES, 'weekly')
    expect(tiers).toHaveLength(1)
    expect(tiers[0].map((e) => e.id).sort()).toEqual([
      'camara-comissoes',
      'camara-gastos',
      'camara-tramitacao',
      'senado-comissoes',
      'senado-tramitacao',
    ])
  })

  it('monthly agrupa em 2 tiers (Eixo 2): cpf antes de tse-bens', () => {
    const tiers = buildTierMatrices(SOURCES, 'monthly')
    expect(tiers).toHaveLength(2)
    expect(tiers[0].map((e) => e.id)).toEqual(['camara-backfill-cpf'])
    expect(tiers[1].map((e) => e.id)).toEqual(['tse-bens'])
  })

  it('cadência sem entradas no registry retorna []', () => {
    const onlyWeekly: IngestionSource[] = [
      {
        id: 'a',
        script: 's:a',
        context: 'c-a',
        cadence: 'weekly',
        tier: 0,
        timeoutMin: 5,
      },
    ]
    expect(buildTierMatrices(onlyWeekly, 'monthly')).toEqual([])
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
