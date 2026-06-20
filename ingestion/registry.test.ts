import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { type Cadence, ingestionSourcesSchema, SOURCES } from './registry'

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
) as { scripts: Record<string, string> }

describe('SOURCES registry', () => {
  it('passa pelo schema Zod (já parseado no import, reafirmado aqui)', () => {
    expect(() => ingestionSourcesSchema.parse(SOURCES)).not.toThrow()
    expect(SOURCES.length).toBeGreaterThan(0)
  })

  it('tem ids únicos', () => {
    const ids = SOURCES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tem contexts únicos (dedupe de incidente não colide)', () => {
    const contexts = SOURCES.map((s) => s.context)
    expect(new Set(contexts).size).toBe(contexts.length)
  })

  it('referencia apenas scripts npm que existem em package.json', () => {
    const missing = SOURCES.filter((s) => !(s.script in pkg.scripts))
    expect(missing.map((s) => `${s.id} → ${s.script}`)).toEqual([])
  })

  it('tem tiers contíguos a partir de 0 em cada cadência', () => {
    const cadences = [...new Set(SOURCES.map((s) => s.cadence))]
    for (const cadence of cadences) {
      const tiers = [
        ...new Set(
          SOURCES.filter((s) => s.cadence === cadence).map((s) => s.tier),
        ),
      ].sort((a, b) => a - b)
      const expected = Array.from({ length: tiers.length }, (_, i) => i)
      expect(tiers, `cadência ${cadence}`).toEqual(expected)
    }
  })

  it('preserva o DAG conhecido da cadência daily (com votações consolidadas)', () => {
    const byTier = (cadence: Cadence, tier: number) =>
      SOURCES.filter((s) => s.cadence === cadence && s.tier === tier)
        .map((s) => s.id)
        .sort()
    expect(byTier('daily', 0)).toEqual([
      'camara-deputados',
      'camara-votacoes',
      'senado-votacoes',
    ])
    expect(byTier('daily', 1)).toEqual([
      'camara-orientacoes',
      'camara-proposicoes',
      'senado-orientacoes',
      'senado-senadores',
    ])
    expect(byTier('daily', 2)).toEqual([
      'camara-backfill-votacao-proposicao',
      'senado-proposicoes',
    ])
    expect(byTier('daily', 3)).toEqual(['senado-backfill-votacao-proposicao'])
  })
})
