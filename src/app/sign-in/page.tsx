import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Rota `/sign-in` — Sprint 4.1 PR 2.
 *
 * Stub server-side que redireciona o usuário para o Account Portal do
 * Clerk (Sprint 4.1 não tem fluxo custom de sign-in dentro do site).
 *
 * Fluxo:
 * 1. Anônimo vê `<a href="/sign-in">Entrar</a>` (AuthSlot path zero-JS)
 * 2. Click em "Entrar" → navega aqui
 * 3. Esta rota chama `redirectToSignIn({ returnBackUrl: '/' })` →
 *    server-side 307 para `https://accounts.<app>.clerk.accounts.dev/sign-in`
 * 4. Account Portal cuida do fluxo de login (Google, email, etc.)
 * 5. Após login, Account Portal redireciona para `/` (returnBackUrl), NÃO
 *    de volta para `/sign-in` (evita loop)
 *
 * Defesas contra loop infinito (Clerk detecta e emite warning sobre
 * "instance keys do not match" — mas a causa real é redirect loop):
 *
 * - **`returnBackUrl: '/'`**: força Account Portal a redirecionar para
 *   `/` após login. Sem isso, Portal usa a URL atual (`/sign-in`) como
 *   destino → volta para esta rota → re-redirect para Portal → loop.
 * - **Check `userId` já autenticado**: se o usuário já tem session válida
 *   (por exemplo, voltou após login mas o cookie ainda não propagou no
 *   primeiro request), redireciona direto para `/`. Defense in depth
 *   contra race condition do Account Portal handshake.
 *
 * Force dynamic — `auth()` precisa da request real (cookies de session).
 *
 * Quando Sprint 4.5 introduzir fluxo de sign-in dentro do site
 * (`/minha-area/sign-in`), substituir por `redirect('/minha-area/sign-in')`
 * ou configurar `signInUrl` no `<ClerkProvider>` apontando para a rota
 * custom.
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
