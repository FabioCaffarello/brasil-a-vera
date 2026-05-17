import { Eye } from 'lucide-react'
import Link from 'next/link'

import { SearchForm } from '@/components/busca/search-form'

import { AuthSlot } from './auth-slot'
import { NavLinks } from './nav-links'

/**
 * Navbar — Sprint 6.1 PR 1 (Wave 6, reskin shell).
 *
 * Mudanças vs Sprint 4.6:
 * - Sticky com `glass-strong` backdrop (ADR-024 utilitário Sprint 6.0)
 * - Logo gráfico com `bg-gradient-primary` (ADR-024) + ícone Eye lucide
 *   (transparência cívica)
 * - Lista de links extraída em `<NavLinks />` client component pequeno
 *   (`'use client'`) para suportar active state via `usePathname`. Mantém
 *   AuthSlot + SearchForm como RSC — zero-JS Clerk anônimo preservado
 *
 * Auth (intocada vs Sprint 4.2):
 * - `<AuthSlot />` RSC decide via `auth()`:
 *   - Anônimo: link estático `<a href="/sign-in">` (zero JS Clerk)
 *   - Autenticado: `<AuthIslandLoader />` lazy via next/dynamic
 *
 * A11y mantida: <nav aria-label="Principal">, skip-link em layout.tsx,
 * focus rings via `ring-ring` semântico.
 *
 * ADRs consumidos: 021 (boundary import — navbar é consumer de DS via
 * primitiva nenhuma direta + composições zero — pure layout/site), 022
 * (Clerk pattern AuthSlot), 023 (CSS only transition), 024 (utilitários
 * --gradient-primary + .glass-strong).
 */
export function Navbar() {
  return (
    <header className="glass-strong sticky top-0 z-30 border-border border-b">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3"
      >
        <Link
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary shadow-glow"
          >
            <Eye className="h-4 w-4 text-white" />
          </span>
          <span className="font-semibold tracking-tight text-foreground">
            Brasil à Vera
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <NavLinks />
          <SearchForm variant="header" />
          <AuthSlot />
        </div>
      </nav>
    </header>
  )
}
