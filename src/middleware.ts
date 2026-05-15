import { clerkMiddleware } from '@clerk/nextjs/server'

/**
 * Middleware do Clerk — Sprint 4.1.
 *
 * Por que `middleware.ts` (não `proxy.ts`):
 *
 * Next 16 (out/2025) renomeou middleware → proxy. O arquivo legacy
 * `middleware.ts` continua funcionando, só emite deprecation warning.
 * `@opennextjs/cloudflare` ainda NÃO suporta `proxy.ts` (issue
 * opennextjs/opennextjs-cloudflare#962). Mantemos `middleware.ts` como
 * dívida conhecida; migração quando suporte chegar. Ver ADR-022 §1.
 *
 * Escopo do matcher: `/minha-area/(.*)` apenas.
 *
 * Sprint 4.1 PR 2 expandiu o matcher para padrão genérico (Clerk
 * quickstart) — necessário para `auth()` server-side em `<AuthSlot />`
 * (Opção B). PR 3 revertou: deploy CI no Cloudflare free tier (3 MiB
 * gzipped) estourou em ~162 KiB porque o Clerk SDK no main handler.mjs
 * crescia além do limite. Detalhes em ADR-022 §3 (v3).
 *
 * Solução: `auth()` removido de RSCs de layout. Auth determination via
 * `<AuthIslandLoader />` no Navbar (client lazy via `next/dynamic`).
 * Anônimos pagam Clerk chunk DEPOIS da hidratação (não bloqueia LCP);
 * Clerk SDK sai do main handler.mjs do server.
 *
 * Como nenhuma rota `/minha-area/*` existe ainda (Sprint 4.5 cria), o
 * middleware está registrado mas dormente (sem `auth.protect()`).
 */
export default clerkMiddleware()

export const config = {
  matcher: ['/minha-area/(.*)'],
}
