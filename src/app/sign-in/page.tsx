import { auth } from '@clerk/nextjs/server'

/**
 * Rota `/sign-in` — Sprint 4.1 PR 2.
 *
 * Stub server-side que redireciona o usuário para o Account Portal do
 * Clerk (Sprint 4.1 não tem fluxo custom de sign-in dentro do site).
 *
 * Por que essa rota existe:
 * - Anônimos veem `<a href="/sign-in">Entrar</a>` (AuthSlot path zero-JS)
 * - Click em "Entrar" → navega aqui → `redirectToSignIn()` redireciona
 *   server-side para `https://accounts.<app>.clerk.accounts.dev/sign-in`
 * - Zero JS de Clerk carregado no client durante todo o caminho anônimo
 *
 * Quando Sprint 4.5 introduzir fluxo de sign-in dentro do site
 * (`/minha-area/sign-in`), substituir o `redirectToSignIn()` por
 * `redirect('/minha-area/sign-in')` aqui, ou configurar `signInUrl` no
 * `<ClerkProvider>` para apontar pra rota custom.
 *
 * Force dynamic — `auth()` precisa da request real (cookies de session).
 * Sem isso o Next tentaria SSG e falharia.
 */
export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const { redirectToSignIn } = await auth()
  redirectToSignIn()
}
