import { describe, expect, it } from 'vitest'

import {
  aggregateProbeResults,
  extractOgImage,
  findMissingAnchors,
  validateOgImageCanonical,
} from './smoke-aggregator'

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

describe('extractOgImage', () => {
  it('extrai content quando property vem antes', () => {
    const html =
      '<meta property="og:image" content="https://example.com/og.png"/>'
    expect(extractOgImage(html)).toBe('https://example.com/og.png')
  })

  it('extrai content quando vem antes de property (ordem invertida)', () => {
    const html =
      '<meta content="https://example.com/og.png" property="og:image"/>'
    expect(extractOgImage(html)).toBe('https://example.com/og.png')
  })

  it('aceita aspas simples', () => {
    const html =
      "<meta property='og:image' content='https://example.com/og.png'/>"
    expect(extractOgImage(html)).toBe('https://example.com/og.png')
  })

  it('retorna null quando meta tag ausente', () => {
    expect(extractOgImage('<html></html>')).toBeNull()
  })

  it('pega o primeiro match (Next emite só 1 og:image por página)', () => {
    const html =
      '<meta property="og:image" content="https://a.com/1.png"/><meta property="og:image" content="https://a.com/2.png"/>'
    expect(extractOgImage(html)).toBe('https://a.com/1.png')
  })
})

describe('validateOgImageCanonical', () => {
  const PROD = 'https://brasil-a-vera.fabio-caffarello.workers.dev'

  it('aceita og:image canônico apontando para baseUrl', () => {
    const html = `<meta property="og:image" content="${PROD}/opengraph-image?abc"/>`
    const r = validateOgImageCanonical(html, PROD)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.ogImage).toBe(`${PROD}/opengraph-image?abc`)
  })

  it('falha quando og:image contém "localhost"', () => {
    const html =
      '<meta property="og:image" content="http://localhost:3000/opengraph-image?abc"/>'
    const r = validateOgImageCanonical(html, PROD)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('localhost')
  })

  it('falha quando og:image aponta para outro domínio', () => {
    const html =
      '<meta property="og:image" content="https://outro-site.com/og.png"/>'
    const r = validateOgImageCanonical(html, PROD)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('não começa com baseUrl')
  })

  it('falha quando meta tag ausente', () => {
    const r = validateOgImageCanonical('<html></html>', PROD)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('ausente')
  })

  it('aceita baseUrl com trailing slash', () => {
    const html = `<meta property="og:image" content="${PROD}/opengraph-image?abc"/>`
    const r = validateOgImageCanonical(html, `${PROD}/`)
    expect(r.ok).toBe(true)
  })
})

describe('findMissingAnchors', () => {
  it('retorna vazio quando todas as âncoras estão presentes', () => {
    const html = '<div>foo bar baz</div>'
    expect(findMissingAnchors(html, ['foo', 'bar'])).toEqual([])
  })

  it('retorna as âncoras ausentes', () => {
    const html = '<div>foo baz</div>'
    expect(findMissingAnchors(html, ['foo', 'bar', 'baz', 'qux'])).toEqual([
      'bar',
      'qux',
    ])
  })

  it('retorna lista vazia para array de âncoras vazio', () => {
    expect(findMissingAnchors('qualquer html', [])).toEqual([])
  })

  it('é case-sensitive (presença literal)', () => {
    const html = '<div>Foo</div>'
    expect(findMissingAnchors(html, ['foo'])).toEqual(['foo'])
    expect(findMissingAnchors(html, ['Foo'])).toEqual([])
  })
})
