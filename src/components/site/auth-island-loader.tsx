'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/design-system/primitives/skeleton'

/**
 * AuthIslandLoader — Sprint 4.1 PR 2.
 *
 * Wrapper cliente que cria um split-point assíncrono para `AuthIsland`.
 * Sem este wrapper, o `AuthIsland` (que importa `ClerkProvider`, `Show`,
 * `SignInButton`, `dark`, `UserButton`) iria para o bundle estático da
 * rota — mesmo quando o servidor renderizasse o caminho anônimo (branch
 * else do `<AuthSlot />`).
 *
 * Como funciona o split:
 * - `next/dynamic(() => import('./auth-island'), { ssr: false })` faz o
 *   bundler criar um chunk SEPARADO para auth-island.tsx
 * - O chunk de auth-island só é referenciado no HTML quando este
 *   `<AuthIslandLoader />` for de fato renderizado
 * - `AuthSlot` (RSC) chama `<AuthIslandLoader />` apenas para autenticados
 * - Anônimo: nem o AuthIslandLoader é renderizado → chunk Clerk não vai
 *   pra HTML → browser nunca baixa
 *
 * Skeleton placeholder enquanto a chunk carrega (autenticados).
 */
const AuthIsland = dynamic(
  () => import('./auth-island').then((m) => m.AuthIsland),
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

export function AuthIslandLoader() {
  return <AuthIsland />
}
