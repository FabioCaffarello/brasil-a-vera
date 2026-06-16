'use client'

import { Show, SignInButton } from '@clerk/nextjs'
import { Button, Skeleton } from '@fabio.caffarello/react-design-system/server'
import dynamic from 'next/dynamic'

/**
 * AuthIsland — Sprint 4.1 PR 2, revisado em Wave 10 (fix em
 * fix/wave-10-single-clerk-provider).
 *
 * **Mudança Wave 10**: o `<ClerkProvider>` que vivia aqui foi removido.
 * Provider agora mora UMA SÓ VEZ no root layout (`src/app/layout.tsx`)
 * — descoberta empírica: múltiplos `<ClerkProvider>` em árvores
 * siblings (auth-island na Navbar vs route group `(authenticated)/`)
 * faz Clerk throwar:
 *
 *   @clerk/nextjs: You've added multiple <ClerkProvider> components
 *
 * Esta ilha consome o Provider do root via Context React. ADR-022 §4
 * Opção B (Provider escopado em ilha) está **revisado** pelo
 * addendum Wave 10 do ADR-029.
 *
 * API do Clerk:
 *   `<Show when="signed-in" />` / `<Show when="signed-out" />` — única
 *   exportada em @clerk/nextjs Core 3+. ADR-022 §2.
 *
 * Topologia atual:
 * - `<Show>` é client-side e leve (condicional sobre state do Provider)
 * - `<UserButton>` via `next/dynamic` com `ssr: false` — só baixa no
 *   client quando a ilha hidrata
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
    <>
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
    </>
  )
}
