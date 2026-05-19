// Layout do route group `(authenticated)/` — Wave 10 Etapa 1.
//
// Decisão ADR-029 §6: `<ClerkProvider>` mora aqui (e não em <html>).
// Rotas anônimas (home, listagens, perfis públicos) NÃO pagam o Provider
// no bundle. Apenas as rotas `/painel/*`, `/sign-in/[[...]]`,
// `/sign-up/[[...]]` ficam dentro deste route group e ganham acesso a
// hooks client de Clerk.
//
// ADR-022 §4 Opção B preservada — `<AuthIslandLoader />` na navbar do
// root layout continua mantendo seu próprio Provider escopado para
// rotas anônimas. Os dois Providers vivem em árvores irmãs no DOM
// (root layout renderiza Navbar fora de `{children}`), não aninhados —
// ambos lêem o mesmo cookie de sessão Clerk.

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

// Não há `dynamic = 'force-dynamic'` aqui — cada `page.tsx` filho declara
// se precisa. Em geral, rotas privadas são dynamic por `auth()`.

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/painel"
      signUpFallbackRedirectUrl="/painel"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  )
}
