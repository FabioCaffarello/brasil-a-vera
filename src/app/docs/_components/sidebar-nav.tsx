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
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'block rounded bg-fg-brand/10 px-3 py-2 font-medium text-fg-brand'
                    : 'block rounded px-3 py-2 text-fg-primary transition-colors duration-150 hover:bg-surface-raised hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas'
                }
                href={href}
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
