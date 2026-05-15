// Builder RSS 2.0 puro — sem I/O. Recebe metadados do feed + items, devolve
// XML string. Conformidade: RSS 2.0 com namespace Atom para `<atom:link
// rel="self">` (recomendado pelo RSS Best Practices Profile).
//
// `pubDate` e `lastBuildDate` saem em RFC 1123 via `toUTCString()` — formato
// aceito por todos os readers populares (Feedly, NetNewsWire, Inoreader).
// RFC 822 estrito tem caprichos de timezone que `toUTCString()` não emite,
// mas a tolerância dos parsers em produção cobre isso.
//
// Sprint 3.2 Tarefa 2.

export type FeedMeta = {
  /** Título do canal (ex: "Brasil a Vera — Votações da Câmara"). */
  title: string
  /** Descrição curta para subscribers. */
  description: string
  /** URL canônica deste arquivo RSS (vai em `<atom:link rel="self">`). */
  feedUrl: string
  /** URL canônica do site (vai em `<link>` do canal). */
  siteUrl: string
  /** Default: `pt-BR`. */
  language?: string
  /** Default: `new Date()` (agora). */
  lastBuildDate?: Date
}

export type FeedItem = {
  title: string
  /** URL canônica do item. */
  link: string
  /** GUID estável — quando `isPermaLink` é true, deve ser uma URL. */
  guid: string
  pubDate: Date
  /** Pode conter HTML; será envolvido em CDATA. */
  description: string
}

export function buildRssFeed(meta: FeedMeta, items: FeedItem[]): string {
  const language = meta.language ?? 'pt-BR'
  const lastBuild = (meta.lastBuildDate ?? new Date()).toUTCString()
  const itemsXml = items.map(renderItem).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(meta.siteUrl)}</link>
    <description>${escapeXml(meta.description)}</description>
    <atom:link href="${escapeXml(meta.feedUrl)}" rel="self" type="application/rss+xml"/>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>${itemsXml ? `\n${itemsXml}` : ''}
  </channel>
</rss>
`
}

function renderItem(item: FeedItem): string {
  return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <description><![CDATA[${escapeCdata(item.description)}]]></description>
    </item>`
}

// Escape mínimo para texto e atributos XML. Apóstrofo escapado também,
// embora não estritamente necessário em texto — seguro para uso em ambos
// os contextos sem ramificar.
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA não escapa entidades XML — mas precisa proteger contra `]]>` que
// terminaria o bloco prematuramente. Truque oficial: dividir o `]]>` em
// `]]]]><![CDATA[>` para que o parser reconstrua a sequência sem fechar.
export function escapeCdata(s: string): string {
  return s.replace(/]]>/g, ']]]]><![CDATA[>')
}
