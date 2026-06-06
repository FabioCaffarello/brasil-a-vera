import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Rotas internas em /dev/* (ex.: /dev/design — QA visual do design system
  // introduzido na Sprint 4.0 PR 7) e /rds/* (staging de validação da adoção
  // do @fabio.caffarello/react-design-system) NÃO devem ser indexadas.
  // Defense in depth: `metadata.robots` no layout cobre crawlers que
  // respeitam meta tags HTML; este header cobre crawlers que só leem
  // headers HTTP. Probe smoke `dev-routes-noindex` valida ambos.
  async headers() {
    return [
      {
        source: '/dev/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/rds/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default nextConfig
