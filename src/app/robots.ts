import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/site-url'

// robots.txt servido em /robots.txt via App Router Metadata Route.
//
// Estratégia:
// - Permitir crawlers principais (Google, Bing) com disallow das rotas
//   privadas (painel, API, dev, auth) e da busca (`?q=` é único por hit
//   — indexar gera N misses sem benefício).
// - Bloquear crawlers comerciais de SEO (Ahrefs, Semrush, Dot, MJ12) —
//   gastam CU-hours no Neon sem benefício para projeto cívico. Esses
//   bots respeitam robots.txt.
// - Bloquear crawlers de IA (GPTBot, ClaudeBot, PerplexityBot,
//   Bytespider): decisão editorial. O projeto serve humanos via UI; não
//   queremos alimentar modelos de terceiros que reproduzem sem trust
//   signals. Owner pode reverter caso decida diferente.
// - Default `*`: permitir, mas disallow nas rotas privadas/dinâmicas.

const PRIVATE_PATHS = ['/painel', '/api/', '/dev/', '/sign-in', '/sign-up']

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'Bingbot',
        allow: ['/'],
        disallow: PRIVATE_PATHS,
      },
      // Crawlers comerciais de SEO — sem benefício para projeto cívico.
      { userAgent: 'AhrefsBot', disallow: '/' },
      { userAgent: 'SemrushBot', disallow: '/' },
      { userAgent: 'DotBot', disallow: '/' },
      { userAgent: 'MJ12bot', disallow: '/' },
      // Crawlers de IA — decisão editorial (ver topo).
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'PerplexityBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      // Default: permitir com disallow das rotas privadas + /busca.
      // /busca tem hit rate de cache zero (cada `?q=X` é único) e cada
      // hit é miss garantido no Neon — fora do índice por design.
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [...PRIVATE_PATHS, '/busca'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
