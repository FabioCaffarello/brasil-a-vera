import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Middleware do Clerk — Sprint 4.2 PR 1 (matcher expandido após Workers Paid).
 *
 * ## middleware.ts vs proxy.ts
 *
 * Next 16 (out/2025) renomeou middleware → proxy. O arquivo legacy
 * `middleware.ts` continua funcionando, só emite deprecation warning.
 * `@opennextjs/cloudflare` ainda NÃO suporta `proxy.ts` (issue
 * opennextjs/opennextjs-cloudflare#962). Mantemos `middleware.ts` como
 * dívida conhecida; migração quando suporte chegar. Ver ADR-022 §1.
 *
 * ## Escopo do matcher (histórico em ADR-022 §3 v4)
 *
 * - **PR 1 (Sprint 4.1)**: `['/minha-area/(.*)']` — escopo restrito
 * - **PR 2 (Sprint 4.1)**: expandido para padrão Clerk (auth() em layout)
 * - **PR 3 (Sprint 4.1)**: REVERTIDO para restrito — Worker > 3 MiB free tier
 * - **PR 1 (Sprint 4.2 — este)**: RE-EXPANDIDO após upgrade Workers Paid
 *
 * Workers Paid ($5/mo, 10 MiB limit) acomoda o Clerk SDK no main handler.mjs
 * com folga (~3.23 MB compressed observado historicamente). Issue
 * #149 documentou o gate; owner executou o upgrade em 2026-05-15.
 *
 * ## Por que matcher amplo agora
 *
 * `<AuthSlot />` RSC server-side usa `auth()` no header de TODAS as
 * páginas para decidir entre link estático "Entrar" (anônimos, zero JS
 * de Clerk) e `<AuthIslandLoader />` (autenticados, carrega Clerk client).
 *
 * `auth()` exige que `clerkMiddleware()` tenha rodado, senão:
 *
 *     Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware()
 *
 * O matcher abaixo segue o padrão Clerk:
 * - Exclui `_next` internals e extensões de asset estáticos
 * - Inclui rotas API
 * - Em modo "dormente" (sem `auth.protect()`). Wave 10 adiciona
 *   `auth.protect()` para `/painel/*` quando rotas privadas existirem.
 *   Ver `docs/product/LOGGED-AREA-VISION.md` §4 e ADR-029. O escopo
 *   originalmente previsto em `/minha-area/*` foi rebrandeado para
 *   `/painel/*` na Wave 10 (addendum no ADR-022).
 *
 * ## Trade-offs aceitos com Workers Paid
 *
 * - ✅ Custo zero JS de Clerk em rotas anônimas (Opção B "pura" restaurada)
 * - ✅ `auth()` server-side disponível em qualquer RSC para Sprint 4.5+
 * - ❌ Pages que eram static (○) viram dynamic (ƒ) por `auth()` em layout
 *   → mitigação via Cache-Control no edge (ADR-018)
 * - ❌ Middleware roda em toda request (~1-2ms CPU) → ainda confortável
 *   dentro do budget Workers Paid 50ms/request (ADR-009)
 * - ❌ Custo recorrente $5/mo (ADR-017 atualizado)
 */
// Hostname legado (Sprint 4.2 migrou pra `brasilavera.org`). O Worker
// continua acessível em `*.workers.dev` porque Cloudflare não desativa
// o default URL quando você adiciona Custom Domain — então redirecionamos
// no middleware (única camada que vê o `Host`; a zona `workers.dev` é da
// Cloudflare e não permite Redirect Rules custom). 301 preserva SEO
// (transfere autoridade do link), preview URLs do Workers Builds
// (`<hash>-brasil-a-vera.fabio-caffarello.workers.dev`) NÃO matcham
// porque a comparação é exata.
const LEGACY_PROD_HOST = 'brasil-a-vera.fabio-caffarello.workers.dev'
const CANONICAL_HOST = 'brasilavera.org'

// Rotas privadas — Wave 10 Etapa 1. `auth.protect()` redireciona anônimo
// para `signInUrl` configurado no `<ClerkProvider>` (route group
// `(authenticated)/`). Wave 10 Etapa 1 NÃO usa webhook do Clerk —
// sincronização do user_profile acontece via lazy upsert na RSC do
// /painel (método tradicional). Decisão documentada no PR.
const isProtectedRoute = createRouteMatcher(['/painel(.*)', '/api/painel(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // TODO(investigate-neon-wake): remover quando ofensor identificado.
  // Ver docs/ops/INVESTIGATE-NEON-WAKE.md. Volume alto (toda request).
  // Sem PII: nada de IP, cookie, ou query string. cf-ipcountry é só país
  // (2 letras). cf-ray ajuda a correlacionar com Analytics da Cloudflare.
  console.log(
    JSON.stringify({
      event: 'request',
      ua: req.headers.get('user-agent') ?? 'unknown',
      path: new URL(req.url).pathname,
      cf_ray: req.headers.get('cf-ray') ?? null,
      cf_ipcountry: req.headers.get('cf-ipcountry') ?? null,
    }),
  )

  if (req.headers.get('host') === LEGACY_PROD_HOST) {
    const url = new URL(req.url)
    url.host = CANONICAL_HOST
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Cobre todas as rotas não-asset (padrão recomendado pelo Clerk).
    // Bloqueia caminhos com extensões estáticas (.html, .css, .js, etc.)
    // e o diretório _next.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Sempre roda em rotas API e tRPC.
    '/(api|trpc)(.*)',
  ],
}
