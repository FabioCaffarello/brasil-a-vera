import { describe, expect, it } from 'vitest'

import type { IngestionSource } from '../registry'
import { SOURCES } from '../registry'
import { buildTierMatrices } from './matrix-builder'

describe('buildTierMatrices', () => {
  it('agrupa daily em 3 tiers preservando o DAG (votações consolidadas)', () => {
    const tiers = buildTierMatrices(SOURCES, 'daily')
    // 3 tiers: roots (t0) → votações/proposições (t1) → orientações/backfills
    // (t2). Cabe nos jobs tier0/tier1/tier2 do workflow daily — sem t3 órfão.
    expect(tiers).toHaveLength(3)
    expect(tiers[0].map((e) => e.id).sort()).toEqual([
      'camara-deputados',
      'senado-senadores',
    ])
    expect(tiers[1].map((e) => e.id).sort()).toEqual([
      'camara-proposicoes',
      'camara-votacoes',
      'senado-proposicoes',
      'senado-votacoes',
    ])
    expect(tiers[2].map((e) => e.id).sort()).toEqual([
      'camara-backfill-votacao-proposicao',
      'camara-orientacoes',
      'senado-backfill-votacao-proposicao',
      'senado-orientacoes',
    ])
  })

  it('weekly é um único tier de jobs independentes', () => {
    const tiers = buildTierMatrices(SOURCES, 'weekly')
    expect(tiers).toHaveLength(1)
    expect(tiers[0].map((e) => e.id).sort()).toEqual([
      'camara-comissoes',
      'camara-discursos',
      'camara-gastos',
      'camara-relatorias',
      'camara-sessoes',
      'camara-tramitacao',
      'senado-comissoes',
      'senado-discursos',
      'senado-relatorias',
      'senado-tramitacao',
    ])
  })

  it('monthly agrupa em 3 tiers (Eixo 2): cpf→tse-bens→backfill-senado-cpf', () => {
    const tiers = buildTierMatrices(SOURCES, 'monthly')
    expect(tiers).toHaveLength(3)
    expect(tiers[0].map((e) => e.id)).toEqual([
      'camara-filiacoes',
      'camara-backfill-bio',
      'senado-backfill-bio',
      'senado-filiacoes',
      'camara-backfill-cpf',
      'camara-liderancas',
      'senado-liderancas',
      'camara-blocos',
      'senado-blocos',
      'camara-frentes',
    ])
    expect(tiers[1].map((e) => e.id)).toEqual(['tse-bens'])
    expect(tiers[2].map((e) => e.id)).toEqual(['senado-backfill-cpf'])
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
