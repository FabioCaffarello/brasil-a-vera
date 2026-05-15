'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/design-system/primitives/skeleton'

/**
 * AuthIslandLoader — Sprint 4.1 PR 3.
 *
 * Thin client wrapper que cria split-point assíncrono para `AuthIsland`.
 * O Navbar (RSC) importa este loader; o módulo `auth-island.tsx` (com
 * `ClerkProvider`, `Show`, `SignInButton`, `UserButton`) só baixa
 * assincronamente após page hydrate.
 *
 * Por que NÃO usamos AuthSlot (RSC com auth() server-side):
 *
 * Sprint 4.1 PR 2 introduziu AuthSlot RSC chamando `auth()` no header.
 * Anônimos veriam link estático "Entrar" (zero JS); autenticados,
 * AuthIslandLoader. Arquitetura "Opção B" do ADR-022 §4.
 *
 * Após merge do PR 2 em main, deploy CI no Cloudflare free tier (3 MiB
 * gzipped) estourou em ~162 KiB. Causa: `auth()` em RSC força Clerk SDK
 * no main handler.mjs do server, somando ~600-1000 KB raw / ~150-300 KB
 * compressed. Sprint 4.1 PR 3 revertou — Clerk só roda no middleware
 * (~150 KB gzipped, próprio bundle) e no client island via this loader.
 *
 * Trade-off aceito (ADR-022 §3 v3):
 * - Perdemos zero-JS-anônimo no path (Clerk chunk baixa lazy após paint)
 * - Anônimos veem Skeleton até hidratar (~200ms tipicamente)
 * - DOM render inicial NÃO inclui Clerk — LCP não afetado
 * - Free tier preservado (vs $5/mo Workers Paid)
 *
 * `next/dynamic` cria split-point real: AuthIsland chunk só é
 * referenciado no HTML quando AuthIslandLoader monta (pós-hydrate).
 *
 * `ssr: false` — Clerk client SDK não roda no SSR. Reduz HTML emitido.
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
