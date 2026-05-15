import Link from 'next/link'

import { SearchForm } from '@/components/busca/search-form'

import { AuthSlot } from './auth-slot'

/**
 * Navbar — Sprint 4.1 PR 2.
 *
 * RSC default. Substitui o header inline do layout.tsx.
 *
 * Consumo dos tokens semânticos do design system (PR 2 da Sprint 4.0):
 * - Estrutura usa zinc/primary legacy ainda (Sprint 4.3 reskinning faz
 *   migração ampla para foreground/surface). Manter pra zero regressão
 *   visual durante a Sprint 4.1 — só introduzimos auth + estrutura.
 *
 * Auth: `<AuthSlot />` decide server-side se anônimo vs autenticado.
 * - Anônimo (default): link estático `<a href="/sign-in">Entrar</a>`,
 *   zero JS de Clerk no bundle do usuário
 * - Autenticado: renderiza `<AuthIsland />` (client lazy com ClerkProvider
 *   + UserButton)
 *
 * Honra a Opção B do ADR-022 §4 — custo zero em rota anônima.
 *
 * A11y mantida: <nav aria-label="Principal">, skip-link continua em
 * layout.tsx, focus rings preservados.
 */
export function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3"
      >
        <Link
          className="font-semibold tracking-tight hover:text-zinc-700 dark:hover:text-zinc-300"
          href="/"
        >
          Brasil a Vera
        </Link>
        <div className="flex items-center gap-4">
          <ul className="hidden items-center gap-4 text-sm sm:flex">
            <li>
              <Link
                className="font-medium text-primary-700 transition-colors duration-150 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-300 dark:hover:text-primary-100"
                href="/o-meu-parlamentar"
              >
                Meu parlamentar
              </Link>
            </li>
            <li>
              <Link
                className="text-zinc-700 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:text-zinc-100"
                href="/parlamentares"
              >
                Parlamentares
              </Link>
            </li>
            <li>
              <Link
                className="text-zinc-700 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:text-zinc-100"
                href="/proposicoes"
              >
                Proposições
              </Link>
            </li>
            <li>
              <Link
                className="text-zinc-700 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:text-zinc-100"
                href="/votacoes"
              >
                Votações
              </Link>
            </li>
            <li>
              <Link
                className="text-zinc-700 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:text-zinc-100"
                href="/docs"
              >
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
