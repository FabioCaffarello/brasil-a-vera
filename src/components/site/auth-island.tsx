'use client'

import { ClerkProvider, Show, SignInButton } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import dynamic from 'next/dynamic'

import { Button } from '@/design-system/primitives/button'
import { Skeleton } from '@/design-system/primitives/skeleton'

/**
 * AuthIsland — Sprint 4.1 PR 2.
 *
 * Ilha cliente isolada que carrega ClerkProvider + componentes de auth
 * APENAS quando este componente hidrata. Decisão Opção B do PR 1
 * (ADR-022 §4): Provider NÃO mora em <html>, mora aqui.
 *
 * API do Clerk:
 *   `<Show when="signed-in" />` / `<Show when="signed-out" />` — NÃO
 *   `<SignedIn>` / `<SignedOut>`. Descoberta empírica durante PR 2:
 *   Clerk 7.x (Core 3) REMOVEU `<SignedIn>`/`<SignedOut>` dos exports
 *   do `@clerk/nextjs`. Apenas `Show` é exportado agora.
 *   Documentado em ADR-022 §2.
 *
 * Topologia:
 * - <ClerkProvider> envolve só os filhos desta ilha (scoped)
 * - <UserButton> via next/dynamic com ssr: false — não vai no SSR
 *   bundle, e o JS só baixa quando ilha hidrata
 * - <Show> é client-side e leve (apenas condicional sobre state)
 *
 * Por que SSR: false no UserButton:
 * - UserButton é puramente client (avatar + dropdown stateful)
 * - SSR-rendering aumentaria HTML inicial sem benefício
 * - ssr: false economiza bundle do server-side render também
 *
 * Skeleton de loading mostra um círculo placeholder até o JS hidratar.
 *
 * Props do Provider (ver ADR-022 §4):
 * - afterSignOutUrl="/" — logout volta à home, não ao Account Portal
 * - appearance={{ baseTheme: dark }} — alinha com shell dark-first
 * - Sem signInUrl/signUpUrl — Account Portal hosted cobre a Sprint 4.1
 */
const UserButton = dynamic(
  () => import('@clerk/nextjs').then((m) => m.UserButton),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        aria-label="Carregando usuário"
        className="h-8 w-8 rounded-full"
      />
    ),
  },
)

export function AuthIsland() {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={{ baseTheme: dark }}>
      <Show when="signed-out">
        <Button asChild size="sm" variant="outline">
          <SignInButton>Entrar</SignInButton>
        </Button>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </Show>
    </ClerkProvider>
  )
}
