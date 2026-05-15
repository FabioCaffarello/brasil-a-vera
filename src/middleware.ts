import { clerkMiddleware } from '@clerk/nextjs/server'

/**
 * Middleware do Clerk — Sprint 4.1.
 *
 * Por que `middleware.ts` (não `proxy.ts`):
 *
 * Next 16 (out/2025) renomeou middleware → proxy. O arquivo legacy
 * `middleware.ts` continua funcionando, só emite deprecation warning.
 *
 * MAS o adapter @opennextjs/cloudflare (nosso runtime de produção, ver
 * ADR-009) ainda NÃO suporta `proxy.ts` — issue
 * opennextjs/opennextjs-cloudflare#962 (aberta out/2025). E mesmo em
 * Workers fora do OpenNext, relato vercel/next.js#86122 mostra proxy.ts
 * não executar atrás de Cloudflare orange-cloud.
 *
 * Decisão registrada em ADR-022 §1: mantemos `middleware.ts` como dívida
 * conhecida; abrir PR de codemod quando o suporte upstream chegar.
 *
 * Escopo do matcher (revisado no PR 2):
 *
 * O matcher cobre TODAS as rotas não-estáticas. Razão: o `<AuthSlot />`
 * (RSC server-side) usa `auth()` no header de TODAS as páginas para
 * decidir entre o link estático "Entrar" (anônimos, zero JS de Clerk) e
 * o `<AuthIsland />` lazy (autenticados, carrega Clerk client). Sem o
 * middleware rodar, `auth()` lança erro:
 *
 *   "auth() was called but Clerk can't detect usage of clerkMiddleware()"
 *
 * Esta é uma REVISÃO do escopo restrito do PR 1 (apenas `/minha-area/(.*)`).
 * Documentado em ADR-022 §3 (v2) com trade-offs:
 * + Permite arquitetura server-side de AuthSlot (Opção B)
 * + Custo zero de Clerk no bundle de rotas anônimas
 * - Middleware roda em toda request (CPU ~1-2ms via clerk session check)
 * - Pages que antes eram static (○) viram dynamic (ƒ) por causa do
 *   auth() em layout — mitigação via Cache-Control (ADR-018)
 *
 * O matcher abaixo segue o padrão recomendado pelo Clerk:
 * - Exclui `_next` internals e extensões de asset estáticos
 * - Inclui rotas API
 * - Em modo "dormente" (sem `auth.protect()`). Sprint 4.5 adiciona
 *   `auth.protect()` para `/minha-area/*` quando rotas privadas existirem.
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
