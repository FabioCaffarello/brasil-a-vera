import { auth } from '@clerk/nextjs/server'

import { AuthIslandLoader } from './auth-island-loader'

/**
 * AuthSlot — Sprint 4.1 PR 2.
 *
 * RSC server-side que decide entre dois caminhos com base em `auth()`:
 *
 * - **Anônimo** (sem session): renderiza um `<a href="/sign-in">Entrar</a>`
 *   estilizado como Button. **Zero JS de Clerk no bundle** — o link é HTML
 *   puro. Quando clicado, navega para `/sign-in/page.tsx` que faz redirect
 *   server-side para o Account Portal.
 * - **Autenticado**: renderiza `<AuthIsland />` (client component lazy).
 *   Só agora o Clerk SDK + `<UserButton>` baixam — usuário autenticado já
 *   "investiu" em interagir com auth, faz sentido pagar o bundle.
 *
 * Esta topologia honra a meta da Opção B (ADR-022 §4): **custo zero em
 * rota anônima**. Comparado com o approach inicial (AuthIsland sempre
 * carregada via static import), economia esperada: ~70kb gzipped por
 * rota anônima.
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
 * - Rotas que se beneficiam mais: estáticas (○, ●) — `/docs`, `/dev/design`,
 *   `/partidos/[sigla]` (SSG)
 * - Rotas dinâmicas (ƒ): cada request decide; cache de edge (ADR-018)
 *   pode segmentar por status auth se quisermos (não implementado nesta
 *   sprint — sem demanda)
 */
export async function AuthSlot() {
  const { userId } = await auth()

  if (userId) {
    // AuthIslandLoader cria split-point assíncrono — chunk AuthIsland
    // (Clerk client + UserButton) só baixa quando este branch executa.
    return <AuthIslandLoader />
  }

  // Anônimo: link estático para /sign-in (que faz redirect server-side
  // para Account Portal). Zero JS de Clerk neste path.
  return (
    <a
      className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 px-3 font-medium text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
      href="/sign-in"
    >
      Entrar
    </a>
  )
}
