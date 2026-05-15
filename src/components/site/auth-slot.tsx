import { auth } from '@clerk/nextjs/server'

import { AuthIslandLoader } from './auth-island-loader'

/**
 * AuthSlot — Sprint 4.2 PR 1 (restaurado após Workers Paid upgrade).
 *
 * RSC server-side que decide entre dois caminhos com base em `auth()`:
 *
 * - **Anônimo** (sem session): renderiza `<a href="/sign-in">Entrar</a>`
 *   estático estilizado como Button outline. **Zero JS de Clerk no bundle
 *   anônimo** — o link é HTML puro. Quando clicado, navega para
 *   `/sign-in/page.tsx` que faz redirect server-side para Account Portal.
 * - **Autenticado**: renderiza `<AuthIslandLoader />` (client component lazy
 *   via next/dynamic). Só agora o Clerk SDK + `<UserButton>` baixam — usuário
 *   autenticado já "investiu" em interagir com auth, faz sentido pagar bundle.
 *
 * Esta topologia honra a Opção B "pura" do ADR-022 §4: **custo zero em
 * rota anônima**. Comparado ao approach do Sprint 4.1 PR 3 (que carregava
 * Clerk via AuthIslandLoader em TODO request, mesmo anônimo, pós-hydrate),
 * agora anônimos NUNCA baixam Clerk client SDK.
 *
 * ## Histórico empírico (ADR-022 §3 v4 documenta completo)
 *
 * 1. Sprint 4.1 PR 1 (#146): planejada arquitetura sem Provider em <html>
 * 2. Sprint 4.1 PR 2 (#147): introduziu AuthSlot RSC + matcher genérico
 * 3. Sprint 4.1 PR 3 (#148): REVERTIDO — deploy CI estourou free tier (3 MiB)
 *    porque Clerk SDK no main handler.mjs empurrou bundle gzipped para 3.23 MB
 * 4. Sprint 4.2 (este PR): RE-APLICADO após upgrade Workers Paid (10 MiB)
 *
 * ## Bundle implications
 *
 * - main handler.mjs gzipped: ~3.23 MB (caberia confortavelmente em Workers Paid 10 MiB)
 * - Anônimos / /docs gzipped client: 201 KB (zero Clerk chunk no HTML inicial)
 * - Autenticados: AuthIsland chunk lazy via `next/dynamic` (~50 KB compressed)
 *
 * Como Next decide o bundle:
 * - Static prerender (build time): `auth()` retorna no userId → branch
 *   anônima é renderizada → HTML gerado não referencia chunk AuthIsland
 *   → browser não baixa chunk
 * - Dynamic render (per request): `auth()` lê cookies da request → branch
 *   varia por usuário → chunk AuthIsland só referenciado em HTML de
 *   usuário autenticado
 *
 * Implicações operacionais:
 * - Rotas estáticas (`/docs/*`, `/partidos/[sigla]`) tornam-se dinâmicas (ƒ)
 *   por causa do `auth()` no header — mitigação via `Cache-Control: s-maxage`
 *   no edge (ADR-018 já cobre os TTLs)
 * - Middleware roda em toda request (~1-2ms CPU) — aceitável dentro do
 *   budget Workers Paid 50ms (ADR-009)
 */
export async function AuthSlot() {
  const { userId } = await auth()

  if (userId) {
    // AuthIslandLoader cria split-point assíncrono via next/dynamic —
    // chunk auth-island.tsx (Clerk client + UserButton) só baixa quando
    // este branch executa (usuário autenticado).
    return <AuthIslandLoader />
  }

  // Anônimo: link estático para /sign-in (server-side redirect a Account
  // Portal). Zero JS de Clerk neste path.
  return (
    <a
      className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong px-3 font-medium text-foreground text-sm transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href="/sign-in"
    >
      Entrar
    </a>
  )
}
