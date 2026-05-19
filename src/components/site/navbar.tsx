import { auth } from '@clerk/nextjs/server'
import { Eye } from 'lucide-react'
import Link from 'next/link'

import { SearchForm } from '@/components/busca/search-form'

import { AuthSlot } from './auth-slot'
import { type NavLink, NavLinks } from './nav-links'
import { NavMobile } from './nav-mobile'

/**
 * Navbar — Wave 6 navbar reskin (pós Sprint 6.1).
 *
 * Shell:
 * - Sticky com backdrop `glass-strong` (ADR-024).
 * - Altura fixa `h-16` (64px) — presença visual + alvo de toque
 *   confortável no mobile (mobile trigger 36px com padding).
 * - Hairline `border-white/[0.08]` em vez do par redundante
 *   `glass-strong + border-border` (glass-strong já injeta border 1px).
 * - `relative` para ancorar `<NavMobile />` painel `absolute top-full`.
 *
 * Logo:
 * - Quadrado gradient (primary→accent ADR-024) + Eye lucide (metáfora
 *   de transparência cívica). Hover ganha micro lift (scale 1.05) e
 *   shadow-glow já vem do utilitário Wave 6.
 * - Wordmark "Brasil à Vera" com `-tracking-tight` para densidade.
 *
 * Cluster direito (decisão pós-spike: manter cluster, não centralizar):
 *   [NavLinks desktop] [SearchForm header] [AuthSlot] [NavMobile trigger]
 *
 * Mobile (< md):
 * - NavLinks e SearchForm escondidos (cada um decide via classe própria).
 * - NavMobile renderiza trigger hambúrguer + painel embutido full-width.
 *
 * Auth (preservada vs Sprint 4.2):
 * - `<AuthSlot />` RSC decide via `auth()`:
 *   - Anônimo: `<Button variant="outline" asChild>` (zero JS Clerk)
 *   - Autenticado: `<AuthIslandLoader />` lazy via next/dynamic
 *
 * A11y:
 * - <nav aria-label="Principal"> landmark único.
 * - Skip-link em layout.tsx (#conteudo).
 * - Focus rings via `ring-ring` semântico.
 *
 * ADRs consumidos: 021 (boundary), 022 (Clerk pattern), 023 (CSS only
 * transitions), 024 (--gradient-primary + .glass-strong).
 *
 * Wave 10 Hotfix 10.3 — link "Painel" para usuário logado.
 *
 * Navbar passa a ser async para chamar `auth()` server-side e derivar
 * `personalLink`. Quando autenticado, prepend `{ href: '/painel', label:
 * 'Painel' }` ao array de links em ambos NavLinks (desktop) e NavMobile.
 * Anônimo recebe `null` → nada extra renderiza.
 *
 * Por que não em `NavLinks` direto: a regra é gating server-side,
 * `'use client'` em NavLinks impede `auth()`. AuthSlot já paga o
 * mesmo custo (RSC com `auth()`); reaproveitamos a infra (Clerk já
 * roda no middleware Workers Paid — ADR-022 §3 v4). Zero flicker
 * (HTML emitido pelo SSR já contém ou omite o link).
 */
export async function Navbar() {
  const { userId } = await auth()
  const personalLink: NavLink | null = userId
    ? { href: '/painel', label: 'Painel' }
    : null

  return (
    <header className="glass-strong sticky top-0 z-30 border-white/[0.08] border-b">
      <nav
        aria-label="Principal"
        className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:gap-6"
      >
        <Link
          className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95"
          >
            <Eye className="h-[18px] w-[18px] text-white" />
          </span>
          <span className="-tracking-tight font-semibold text-[15px] text-foreground">
            Brasil à Vera
          </span>
        </Link>
        <div className="flex items-center gap-1 md:gap-3">
          <NavLinks personalLink={personalLink} />
          <SearchForm variant="header" />
          <AuthSlot />
          <NavMobile personalLink={personalLink} />
        </div>
      </nav>
    </header>
  )
}
