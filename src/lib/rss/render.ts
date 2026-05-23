// Helpers que ligam queries RSS → buildRssFeed → Response HTTP. Funções
// pequenas isoladas para que cada route handler seja só "qual query rodar
// + qual meta usar". Sem lógica de negócio aqui.

import { buildRssFeed, type FeedItem, type FeedMeta } from './builder'
import type { RssVotacaoRow } from './queries'

const RSS_CACHE_HEADERS = {
  'content-type': 'application/rss+xml; charset=utf-8',
  // 1h — alinhado com cron de votações (4×/dia). Scrapers e CDN cacheiam
  // 1h sem revalidar; depois disso a edge re-renderiza com query nova.
  'cache-control': 'public, max-age=3600, s-maxage=3600',
}

export function votacaoToFeedItem(
  row: RssVotacaoRow,
  siteUrl: string,
): FeedItem {
  const link = `${siteUrl}/votacoes/${row.id}`
  const casaLabel =
    row.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'
  const resultado = row.aprovada ? 'Aprovada' : 'Rejeitada'
  const description = [
    `<p><strong>Resultado:</strong> ${resultado}</p>`,
    `<p>SIM: ${row.votosSim} · NÃO: ${row.votosNao} · Abstenções: ${row.abstencoes}</p>`,
    `<p><em>Casa:</em> ${casaLabel}</p>`,
  ].join('\n')

  // `dataHora` vem como Date no path direto (Node/CI/dev sem
  // `caches.default`) e como string ISO após cache round-trip JSON.
  // Normaliza para o `buildRssFeed`, que chama `.toUTCString()`.
  const pubDate =
    row.dataHora instanceof Date ? row.dataHora : new Date(row.dataHora)

  return {
    title: row.descricao,
    link,
    guid: link,
    pubDate,
    description,
  }
}

export function renderFeedResponse(
  meta: FeedMeta,
  rows: RssVotacaoRow[],
  siteUrl: string,
): Response {
  const items = rows.map((r) => votacaoToFeedItem(r, siteUrl))
  const xml = buildRssFeed(meta, items)
  return new Response(xml, { headers: RSS_CACHE_HEADERS })
}
