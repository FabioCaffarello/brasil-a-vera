import { clerkMiddleware } from '@clerk/nextjs/server'

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
 * - Em modo "dormente" (sem `auth.protect()`). Sprint 4.5 adiciona
 *   `auth.protect()` para `/minha-area/*` quando rotas privadas existirem.
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
export default clerkMiddleware()

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
