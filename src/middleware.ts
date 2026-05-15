import { clerkMiddleware } from '@clerk/nextjs/server'

/**
 * Middleware do Clerk — Sprint 4.1 PR 1.
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
 * Decisão registrada em ADR-022 §"Migração para proxy.ts": mantemos
 * `middleware.ts` como dívida conhecida; abrir PR de codemod quando
 * o suporte upstream chegar. Princípio 13 + ADR-019: não preemptar
 * suporte que ainda não existe upstream.
 *
 * Escopo do matcher:
 *
 * `/minha-area/(.*)` apenas. NÃO usamos o matcher genérico do quickstart
 * Clerk (`/((?!_next|...).*)+/(api|trpc)(.*)`), porque rotas públicas em
 * Brasil a Vera NÃO devem invocar Clerk — custaria CPU em toda request
 * pública (~80% do tráfego) e potencialmente quebraria edge cache
 * (ADR-018). Custo CPU está em ADR-017 (budget).
 *
 * Modo "dormente" no Sprint 4.1:
 *
 * `clerkMiddleware()` sem `auth.protect()` deixa tudo público. Como
 * NENHUMA rota /minha-area/* existe ainda (Sprint 4.5 vai criar), o
 * middleware está registrado mas dormente. No 4.5 adicionamos
 * `auth.protect()` dentro do handler.
 */
export default clerkMiddleware()

export const config = {
  matcher: ['/minha-area/(.*)'],
}
