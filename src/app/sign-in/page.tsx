import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Rota `/sign-in` — Sprint 4.2 PR 1 (restaurada após Workers Paid).
 *
 * Stub server-side que redireciona o usuário para o Account Portal do
 * Clerk (Sprint 4.2 não tem fluxo custom de sign-in dentro do site).
 *
 * Fluxo:
 * 1. Anônimo vê `<a href="/sign-in">Entrar</a>` (AuthSlot path zero-JS)
 * 2. Click em "Entrar" → navega aqui
 * 3. Esta rota chama `redirectToSignIn({ returnBackUrl: '/' })` → 307
 *    para `https://accounts.<app>.clerk.accounts.dev/sign-in`
 * 4. Account Portal cuida do fluxo de login (Google, email, etc.)
 * 5. Após login, Account Portal redireciona para `/` (returnBackUrl), NÃO
 *    de volta para `/sign-in` (evita loop)
 *
 * ## Defesas contra loop infinito (incidente Sprint 4.1 PR 2)
 *
 * Owner detectou empíricamente no PR 2 da Sprint 4.1 que sem `returnBackUrl`,
 * Clerk Account Portal redireciona de volta para a URL atual (`/sign-in`),
 * que re-executa `redirectToSignIn()`, criando loop. Clerk detecta e emite:
 *
 *     Clerk: Refreshing the session token resulted in an infinite redirect loop.
 *     This usually means that your Clerk instance keys do not match
 *
 * (Mensagem enganosa — keys estão certas; causa real é o loop da rota.)
 *
 * Fix aplicado (e mantido nesta restauração):
 *
 * 1. **`returnBackUrl: '/'`**: força Account Portal a redirecionar para
 *    home após login, não para `/sign-in`. Quebra o loop.
 * 2. **Check `userId` já autenticado**: defense in depth contra race
 *    condition (se `auth()` já vê userId no primeiro retorno, redireciona
 *    direto para `/` em vez de chamar redirectToSignIn).
 *
 * Force dynamic — `auth()` precisa da request real (cookies de session).
 *
 * Wave 10 substitui este stub por custom sign-in com catch-all em
 * `app/sign-in/[[...sign-in]]/page.tsx` e `signInUrl="/sign-in"` no
 * `<ClerkProvider>` do route group `(authenticated)/`. Ver
 * `docs/product/LOGGED-AREA-VISION.md` §4 e ADR-029. O escopo
 * originalmente previsto em `/minha-area/sign-in` foi rebrandeado
 * para `/sign-in/[[...sign-in]]` na Wave 10 (addendum no ADR-022).
 */
export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const { userId, redirectToSignIn } = await auth()

  // Defense in depth: se já autenticado, vai para home. Evita loop quando
  // Account Portal completa handshake mas devolve para /sign-in.
  if (userId) {
    redirect('/')
  }

  // returnBackUrl: '/' — Account Portal redireciona para home após login,
  // não para /sign-in (que voltaria a este handler).
  redirectToSignIn({ returnBackUrl: '/' })
}
