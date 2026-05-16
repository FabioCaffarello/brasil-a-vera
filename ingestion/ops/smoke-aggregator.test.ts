import { describe, expect, it } from 'vitest'

import {
  aggregateProbeResults,
  extractOgImage,
  findDuplicateHashes,
  findMissingAnchors,
  hasRssDiscovery,
  validateDevRouteNoindex,
  validateOgImageCanonical,
  validateRssXml,
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
  const PROD = 'https://brasilavera.org'

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

describe('findDuplicateHashes', () => {
  it('retorna vazio para todos hashes únicos', () => {
    expect(findDuplicateHashes(['a', 'b', 'c'])).toEqual([])
  })

  it('retorna o hash duplicado quando aparece duas vezes', () => {
    expect(findDuplicateHashes(['a', 'b', 'a'])).toEqual(['a'])
  })

  it('cada duplicado aparece apenas uma vez na saída', () => {
    expect(findDuplicateHashes(['a', 'b', 'a', 'a', 'c']).sort()).toEqual(['a'])
  })

  it('detecta múltiplos hashes duplicados independentes', () => {
    expect(findDuplicateHashes(['a', 'b', 'a', 'b', 'c']).sort()).toEqual([
      'a',
      'b',
    ])
  })

  it('lista vazia retorna vazio', () => {
    expect(findDuplicateHashes([])).toEqual([])
  })
})

describe('validateRssXml', () => {
  const VALID_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>x</title>
    <atom:link href="http://x/feed" rel="self" type="application/rss+xml"/>
    <item><title>i</title></item>
  </channel>
</rss>`

  it('aceita feed válido com content-type correto', () => {
    expect(
      validateRssXml(VALID_RSS, 'application/rss+xml; charset=utf-8'),
    ).toEqual({ ok: true })
  })

  it('aceita content-type sem charset', () => {
    expect(validateRssXml(VALID_RSS, 'application/rss+xml')).toEqual({
      ok: true,
    })
  })

  it('rejeita content-type errado (text/xml)', () => {
    const r = validateRssXml(VALID_RSS, 'text/xml')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('content-type')
  })

  it('rejeita sem `<?xml`', () => {
    const r = validateRssXml(
      VALID_RSS.replace('<?xml version="1.0" encoding="UTF-8"?>\n', ''),
      'application/rss+xml',
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('<?xml')
  })

  it('rejeita sem `<rss version="2.0"`', () => {
    const r = validateRssXml(
      '<?xml version="1.0"?><foo/>',
      'application/rss+xml',
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('rss version="2.0"')
  })

  it('rejeita sem `<channel>`', () => {
    const r = validateRssXml(
      '<?xml version="1.0"?><rss version="2.0"></rss>',
      'application/rss+xml',
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('<channel>')
  })

  it('rejeita sem atom:link rel=self', () => {
    const r = validateRssXml(
      `<?xml version="1.0"?>
<rss version="2.0">
  <channel><title>x</title><item><title>i</title></item></channel>
</rss>`,
      'application/rss+xml',
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('atom:link')
  })

  it('rejeita feed sem items', () => {
    const r = validateRssXml(
      `<?xml version="1.0"?>
<rss version="2.0"><channel><title>x</title><atom:link href="x" rel="self" type="application/rss+xml"/></channel></rss>`,
      'application/rss+xml',
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('items')
  })
})

describe('hasRssDiscovery', () => {
  it('detecta link com rel antes de type', () => {
    const html =
      '<head><link rel="alternate" type="application/rss+xml" href="/feed"/></head>'
    expect(hasRssDiscovery(html)).toBe(true)
  })

  it('detecta link com type antes de rel', () => {
    const html =
      '<head><link type="application/rss+xml" rel="alternate" href="/feed"/></head>'
    expect(hasRssDiscovery(html)).toBe(true)
  })

  it('é case-insensitive no atributo', () => {
    const html =
      '<HEAD><LINK REL="alternate" TYPE="application/rss+xml" HREF="/feed"/></HEAD>'
    expect(hasRssDiscovery(html)).toBe(true)
  })

  it('retorna false para link com rel diferente', () => {
    const html =
      '<head><link rel="stylesheet" type="application/rss+xml" href="/feed"/></head>'
    expect(hasRssDiscovery(html)).toBe(false)
  })

  it('retorna false para link com type diferente', () => {
    const html =
      '<head><link rel="alternate" type="application/atom+xml" href="/feed"/></head>'
    expect(hasRssDiscovery(html)).toBe(false)
  })

  it('retorna false quando link ausente', () => {
    expect(hasRssDiscovery('<head></head>')).toBe(false)
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

describe('validateDevRouteNoindex', () => {
  const okHtml =
    '<html><head><meta name="robots" content="noindex, nofollow, nocache"/></head></html>'

  it('aceita header X-Robots-Tag noindex + meta robots noindex no HTML', () => {
    expect(validateDevRouteNoindex('noindex, nofollow', okHtml)).toEqual({
      ok: true,
    })
  })

  it('aceita meta tag com ordem invertida de atributos', () => {
    const html = '<html><meta content="noindex" name="robots"/></html>'
    expect(validateDevRouteNoindex('noindex', html)).toEqual({ ok: true })
  })

  it('rejeita quando X-Robots-Tag header está ausente (null)', () => {
    const r = validateDevRouteNoindex(null, okHtml)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('X-Robots-Tag header')
  })

  it('rejeita quando X-Robots-Tag não contém "noindex"', () => {
    const r = validateDevRouteNoindex('index, follow', okHtml)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('X-Robots-Tag header')
  })

  it('rejeita quando o HTML não tem meta robots noindex', () => {
    const html = '<html><head><title>x</title></head></html>'
    const r = validateDevRouteNoindex('noindex', html)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('meta name="robots"')
  })

  it('é case-insensitive no header (Cloudflare normaliza case)', () => {
    expect(validateDevRouteNoindex('NoIndex, NoFollow', okHtml).ok).toBe(true)
  })

  it('rejeita meta robots sem "noindex" explícito', () => {
    const html =
      '<html><head><meta name="robots" content="index, follow"/></head></html>'
    const r = validateDevRouteNoindex('noindex', html)
    expect(r.ok).toBe(false)
  })
})
