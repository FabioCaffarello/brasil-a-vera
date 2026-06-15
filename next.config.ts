import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Rotas internas em /dev/* (ex.: /dev/design — QA visual do design system,
  // Sprint 4.0 PR 7) NÃO devem ser indexadas. Defense in depth:
  // `metadata.robots` no layout cobre crawlers que respeitam meta tags HTML;
  // este header cobre crawlers que só leem headers HTTP. Probe smoke
  // `dev-routes-noindex` valida. (O staging /rds/* da migração RDS foi removido
  // ao consolidar as rotas em produção — ADR-033; este header foi aposentado
  // junto.)
  async headers() {
    return [
      {
        source: '/dev/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default nextConfig
