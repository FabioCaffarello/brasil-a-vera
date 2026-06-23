import { describe, expect, it } from 'vitest'

import { buildListaHref, restantesPrimeiraPagina } from './pagination'

const KEYS = ['casa', 'partido', 'after'] as const

describe('buildListaHref', () => {
  it('preserva filtros e sobrescreve o override', () => {
    expect(
      buildListaHref(
        '/parlamentares',
        { casa: 'CAMARA', partido: 'PT' },
        KEYS,
        { after: 'abc' },
      ),
    ).toBe('/parlamentares?casa=CAMARA&partido=PT&after=abc')
  })

  it('strip de valores null / undefined / vazio (após override)', () => {
    expect(
      buildListaHref('/parlamentares', { casa: 'CAMARA', partido: '' }, KEYS, {
        after: null,
      }),
    ).toBe('/parlamentares?casa=CAMARA')
  })

  it('só inclui as keys permitidas (ignora params fora da lista)', () => {
    expect(
      buildListaHref(
        '/parlamentares',
        { casa: 'CAMARA', xpto: 'ignorado' },
        KEYS,
      ),
    ).toBe('/parlamentares?casa=CAMARA')
  })

  it('sem params → basePath puro', () => {
    expect(buildListaHref('/parlamentares', {}, KEYS)).toBe('/parlamentares')
  })
})

describe('restantesPrimeiraPagina', () => {
  it('1ª página (sem cursor): total - pageSize', () => {
    expect(restantesPrimeiraPagina(false, 100, 24)).toBe(76)
  })

  it('nunca negativo (total ≤ pageSize)', () => {
    expect(restantesPrimeiraPagina(false, 10, 24)).toBe(0)
  })

  it('páginas seguintes (com cursor): null', () => {
    expect(restantesPrimeiraPagina(true, 100, 24)).toBeNull()
  })
})
