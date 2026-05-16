import Link from 'next/link'

import { SearchForm } from '@/components/busca/search-form'

import { AuthSlot } from './auth-slot'

/**
 * Navbar — Sprint 4.2 PR 1 (AuthSlot restaurado), refeita em Sprint 4.6
 * para tokens semânticos OKLCH (Wave 4 polimento final).
 *
 * RSC default. Substitui o header inline do layout.tsx.
 *
 * Auth: `<AuthSlot />` RSC server-side decide via `auth()`:
 * - Anônimo (~80% do tráfego): renderiza link estático `<a href="/sign-in">`
 *   (zero JS de Clerk no path anônimo)
 * - Autenticado: renderiza `<AuthIslandLoader />` (client lazy via
 *   next/dynamic; carrega ClerkProvider + UserButton)
 *
 * Histórico em ADR-022 §3 v4: Opção B "pura" tentada na Sprint 4.1 PR 2,
 * revertida no PR 3 por estourar Worker free tier, restaurada na Sprint
 * 4.2 PR 1 após upgrade Workers Paid (issue #149).
 *
 * A11y mantida: <nav aria-label="Principal">, skip-link continua em
 * layout.tsx, focus rings preservados (agora via `ring-ring` semântico).
 *
 * Link "Meu parlamentar" tratado como brand action (cor `text-brand`)
 * — porta de entrada cívica recomendada, destaca-se dos demais links.
 */
const NAV_LINK_CLASS =
  'text-foreground transition-colors duration-150 hover:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function Navbar() {
  return (
    <header className="border-border border-b bg-surface">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3"
      >
        <Link
          className="font-semibold tracking-tight text-foreground hover:text-foreground-muted"
          href="/"
        >
          Brasil a Vera
        </Link>
        <div className="flex items-center gap-4">
          <ul className="hidden items-center gap-4 text-sm sm:flex">
            <li>
              <Link
                className="font-medium text-brand transition-colors duration-150 hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href="/o-meu-parlamentar"
              >
                Meu parlamentar
              </Link>
            </li>
            <li>
              <Link className={NAV_LINK_CLASS} href="/parlamentares">
                Parlamentares
              </Link>
            </li>
            <li>
              <Link className={NAV_LINK_CLASS} href="/proposicoes">
                Proposições
              </Link>
            </li>
            <li>
              <Link className={NAV_LINK_CLASS} href="/votacoes">
                Votações
              </Link>
            </li>
            <li>
              <Link className={NAV_LINK_CLASS} href="/docs">
                Docs
              </Link>
            </li>
          </ul>
          <SearchForm variant="header" />
          <AuthSlot />
        </div>
      </nav>
    </header>
  )
}
