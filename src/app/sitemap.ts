import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/site-url'

// sitemap.xml servido em /sitemap.xml via App Router Metadata Route.
//
// Estratégia: sitemap ESTÁTICO com rotas-âncora. NÃO geramos sitemap
// dinâmico listando votações/proposições/parlamentares — isso exigiria
// queries no banco a cada hit do sitemap, defeating the purpose
// (Googlebot/Bingbot batem aqui regularmente).
//
// Quando issue #58 (R2 incremental cache) entrar, sitemap dinâmico passa
// a fazer sentido (geração no build/cron + servido do R2).

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const now = new Date()
  return [
    { url: `${base}/`, lastModified: now, priority: 1.0 },
    { url: `${base}/votacoes`, lastModified: now, priority: 0.9 },
    { url: `${base}/proposicoes`, lastModified: now, priority: 0.9 },
    { url: `${base}/parlamentares`, lastModified: now, priority: 0.9 },
    { url: `${base}/comparar`, lastModified: now, priority: 0.7 },
    { url: `${base}/feed`, lastModified: now, priority: 0.5 },
    { url: `${base}/docs`, lastModified: now, priority: 0.5 },
    { url: `${base}/docs/glossario`, lastModified: now, priority: 0.4 },
    { url: `${base}/docs/fontes`, lastModified: now, priority: 0.4 },
    {
      url: `${base}/docs/como-ler-um-perfil`,
      lastModified: now,
      priority: 0.4,
    },
    {
      url: `${base}/docs/piramide-de-confianca`,
      lastModified: now,
      priority: 0.4,
    },
    { url: `${base}/privacidade`, lastModified: now, priority: 0.3 },
  ]
}
