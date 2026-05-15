'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Ordem deliberada: hub primeiro, conceitos antes de operacional, glossário
// e fontes ao final (referência consultiva).
const DOCS_NAV = [
  { href: '/docs', label: 'Visão geral' },
  { href: '/docs/piramide-de-confianca', label: 'Pirâmide de Confiança' },
  { href: '/docs/como-ler-um-perfil', label: 'Como ler um perfil' },
  { href: '/docs/glossario', label: 'Glossário' },
  { href: '/docs/fontes', label: 'Fontes e cadência' },
] as const

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Documentação">
      <ul className="space-y-1 text-sm">
        {DOCS_NAV.map(({ href, label }) => {
          const isActive = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'block rounded px-3 py-2 font-medium text-primary-700 bg-primary-50 dark:bg-primary-950 dark:text-primary-200'
                    : 'block rounded px-3 py-2 text-zinc-700 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                }
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
