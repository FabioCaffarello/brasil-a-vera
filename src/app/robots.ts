import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/site-url'

// robots.txt servido em /robots.txt via App Router Metadata Route.
//
// Estratégia:
// - Permitir crawlers principais (Google, Bing) com disallow das rotas
//   privadas (painel, API, auth) e da busca (`?q=` é único por hit —
//   indexar gera N misses sem benefício).
// - Bloquear crawlers comerciais de SEO (Ahrefs, Semrush, Dot, MJ12) —
//   gastam CU-hours no Neon sem benefício para projeto cívico. Esses
//   bots respeitam robots.txt.
// - Bloquear crawlers de IA (GPTBot, ClaudeBot, PerplexityBot,
//   Bytespider): decisão editorial. O projeto serve humanos via UI; não
//   queremos alimentar modelos de terceiros que reproduzem sem trust
//   signals. Owner pode reverter caso decida diferente.
// - Default `*`: permitir, mas disallow nas rotas privadas/dinâmicas.

const PRIVATE_PATHS = ['/painel', '/api/', '/sign-in', '/sign-up']

// Rotas cache-hostis: keyspace ilimitado (busca `?q=`, comparar `?ids=` com
// ~22M combinações) → cada hit de crawler é miss garantido no Neon. Fechadas
// para TODOS os bots, inclusive Google/Bing, desde o incidente de egress #768.
// `/comparar?` (com query) bloqueia as permutações sem tirar a página-base
// do índice.
const CACHE_HOSTILE_PATHS = ['/busca', '/comparar?']

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: [...PRIVATE_PATHS, ...CACHE_HOSTILE_PATHS],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/'],
        disallow: [...PRIVATE_PATHS, ...CACHE_HOSTILE_PATHS],
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
      // Default: permitir com disallow das rotas privadas + cache-hostis.
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [...PRIVATE_PATHS, ...CACHE_HOSTILE_PATHS],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
