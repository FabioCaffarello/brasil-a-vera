import { auth } from '@clerk/nextjs/server'

import { Button } from '@/design-system/primitives/button'

import { AuthIslandLoader } from './auth-island-loader'

/**
 * AuthSlot — Sprint 4.2 PR 1 (restaurado após Workers Paid upgrade).
 *
 * RSC server-side que decide entre dois caminhos com base em `auth()`:
 *
 * - **Anônimo**: renderiza `<Button variant="outline" asChild>` envolvendo
 *   `<a href="/sign-in">`. **Zero JS de Clerk no bundle anônimo** — Button
 *   primitive é Server Component compatível (sem `'use client'`, sem state),
 *   o link é HTML puro. Quando clicado, navega para `/sign-in/page.tsx`
 *   que faz redirect server-side para Account Portal.
 * - **Autenticado**: renderiza `<AuthIslandLoader />` (client component lazy
 *   via next/dynamic). Clerk SDK + `<UserButton>` baixam só agora — usuário
 *   autenticado já "investiu" em interagir com auth, faz sentido pagar bundle.
 *
 * Esta topologia honra a Opção B "pura" do ADR-022 §4: **custo zero em
 * rota anônima**.
 *
 * Refactor pós-spike navbar: substituído `<a>` hand-styled (imitava
 * `Button outline` manualmente) por `<Button asChild variant="outline">`.
 * Vantagens: coerência com DS, ring/focus tokens centralizados, classe
 * unificada se o variant outline evoluir.
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
    <Button asChild size="sm" variant="outline">
      <a href="/sign-in">Entrar</a>
    </Button>
  )
}
