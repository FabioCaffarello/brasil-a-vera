import { describe, expect, it } from 'vitest'

import { buildRssFeed, escapeCdata, escapeXml } from './builder'

const META = {
  title: 'Brasil a Vera — Votações',
  description: 'Últimas votações nominais',
  feedUrl: 'https://brasil-a-vera.example/feed/votacoes',
  siteUrl: 'https://brasil-a-vera.example',
  lastBuildDate: new Date('2026-05-15T12:00:00Z'),
}

describe('escapeXml', () => {
  it('escapa os 5 caracteres especiais', () => {
    expect(escapeXml('a & b < c > d " e \' f')).toBe(
      'a &amp; b &lt; c &gt; d &quot; e &apos; f',
    )
  })

  it('não altera string sem caracteres especiais', () => {
    expect(escapeXml('hello world 123')).toBe('hello world 123')
  })
})

describe('escapeCdata', () => {
  it('quebra `]]>` para não fechar o bloco CDATA', () => {
    expect(escapeCdata('foo]]>bar')).toBe('foo]]]]><![CDATA[>bar')
  })

  it('preserva conteúdo sem ]]>', () => {
    expect(escapeCdata('<p>hello & world</p>')).toBe('<p>hello & world</p>')
  })
})

describe('buildRssFeed', () => {
  it('produz XML válido com 0 items', () => {
    const xml = buildRssFeed(META, [])
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<channel>')
    expect(xml).toContain('</channel>')
    expect(xml).toContain('</rss>')
    expect(xml).not.toContain('<item>')
  })

  it('inclui atom:link rel=self apontando para feedUrl', () => {
    const xml = buildRssFeed(META, [])
    expect(xml).toContain(
      '<atom:link href="https://brasil-a-vera.example/feed/votacoes" rel="self" type="application/rss+xml"/>',
    )
  })

  it('usa language padrão pt-BR quando não especificado', () => {
    const xml = buildRssFeed(META, [])
    expect(xml).toContain('<language>pt-BR</language>')
  })

  it('respeita language customizado', () => {
    const xml = buildRssFeed({ ...META, language: 'en-US' }, [])
    expect(xml).toContain('<language>en-US</language>')
  })

  it('formata lastBuildDate em RFC 1123 (toUTCString)', () => {
    const xml = buildRssFeed(META, [])
    expect(xml).toContain(
      '<lastBuildDate>Fri, 15 May 2026 12:00:00 GMT</lastBuildDate>',
    )
  })

  it('escapa caracteres especiais no título do canal', () => {
    const xml = buildRssFeed({ ...META, title: 'Tom & Jerry < "rss"' }, [])
    expect(xml).toContain('<title>Tom &amp; Jerry &lt; &quot;rss&quot;</title>')
  })

  it('renderiza items com todos os campos obrigatórios', () => {
    const xml = buildRssFeed(META, [
      {
        title: 'Votação X',
        link: 'https://brasil-a-vera.example/votacoes/abc',
        guid: 'https://brasil-a-vera.example/votacoes/abc',
        pubDate: new Date('2026-05-14T10:30:00Z'),
        description: '<p>Resultado: <strong>Aprovada</strong></p>',
      },
    ])
    expect(xml).toContain('<item>')
    expect(xml).toContain('<title>Votação X</title>')
    expect(xml).toContain(
      '<link>https://brasil-a-vera.example/votacoes/abc</link>',
    )
    expect(xml).toContain(
      '<guid isPermaLink="true">https://brasil-a-vera.example/votacoes/abc</guid>',
    )
    expect(xml).toContain('<pubDate>Thu, 14 May 2026 10:30:00 GMT</pubDate>')
    expect(xml).toContain(
      '<description><![CDATA[<p>Resultado: <strong>Aprovada</strong></p>]]></description>',
    )
    expect(xml).toContain('</item>')
  })

  it('preserva ordem dos items', () => {
    const xml = buildRssFeed(META, [
      {
        title: 'Item A',
        link: 'https://x/a',
        guid: 'https://x/a',
        pubDate: new Date('2026-05-15T00:00:00Z'),
        description: 'a',
      },
      {
        title: 'Item B',
        link: 'https://x/b',
        guid: 'https://x/b',
        pubDate: new Date('2026-05-14T00:00:00Z'),
        description: 'b',
      },
    ])
    const idxA = xml.indexOf('Item A')
    const idxB = xml.indexOf('Item B')
    expect(idxA).toBeGreaterThan(-1)
    expect(idxB).toBeGreaterThan(-1)
    expect(idxA).toBeLessThan(idxB)
  })

  it('protege CDATA contra ]]> no conteúdo', () => {
    const xml = buildRssFeed(META, [
      {
        title: 't',
        link: 'https://x/1',
        guid: 'https://x/1',
        pubDate: new Date('2026-05-15T00:00:00Z'),
        description: 'foo]]>bar',
      },
    ])
    expect(xml).toContain(
      '<description><![CDATA[foo]]]]><![CDATA[>bar]]></description>',
    )
  })

  it('escapa ampersand em URL (query string)', () => {
    const xml = buildRssFeed(
      { ...META, feedUrl: 'https://x.com/feed?a=1&b=2' },
      [],
    )
    expect(xml).toContain('href="https://x.com/feed?a=1&amp;b=2"')
  })
})
