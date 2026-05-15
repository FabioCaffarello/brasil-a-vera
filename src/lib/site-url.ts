// URL canônica do site, resolvida em runtime/build. Mesma lógica do
// `metadataBase` em src/app/layout.tsx — extraída aqui para reuso por
// route handlers (feeds RSS, etc) sem duplicar a tabela de precedência.
//
// Prioridade:
//   1. SITE_URL explícita (preview deploys do Cloudflare Workers Builds)
//   2. http://localhost:3000 SÓ se NODE_ENV === 'development'
//   3. Domínio canônico de produção como default

export function getSiteUrl(): string {
  return (
    process.env.SITE_URL ??
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://brasil-a-vera.fabio-caffarello.workers.dev')
  )
}
