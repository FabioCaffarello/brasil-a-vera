'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'

type NavLink = {
  href: string
  label: string
  /**
   * Quando true, link recebe ênfase `text-brand` mesmo fora do active
   * state — usado para "Meu parlamentar" como porta de entrada cívica
   * recomendada (convenção Wave 4.1).
   */
  brand?: boolean
}

const LINKS: NavLink[] = [
  { href: '/o-meu-parlamentar', label: 'Meu parlamentar', brand: true },
  { href: '/parlamentares', label: 'Parlamentares' },
  { href: '/proposicoes', label: 'Proposições' },
  { href: '/votacoes', label: 'Votações' },
  { href: '/docs', label: 'Docs' },
]

/**
 * NavLinks — Sprint 6.1 PR 1 (Wave 6).
 *
 * Client component pequeno (~1kb gzip) extraído do Navbar para
 * suportar active state via `usePathname()`. Active = pathname
 * começa com o href do link (ou é exatamente "/" para a home).
 *
 * Active link recebe `aria-current="page"` (WCAG 2.4.8 / 4.1.2) +
 * estilo destacado (`bg-surface-elevated` para neutros, `bg-brand/10`
 * para o brand link).
 *
 * Não muda comportamento de auth nem SearchForm — esses ficam fora
 * deste cliente (Navbar mantém AuthSlot RSC anônimo zero-JS Clerk).
 */
export function NavLinks() {
  const pathname = usePathname()

  return (
    <ul className="hidden items-center gap-1 text-sm sm:flex">
      {LINKS.map((link) => {
        const isActive =
          link.href === '/'
            ? pathname === '/'
            : (pathname?.startsWith(link.href) ?? false)

        return (
          <li key={link.href}>
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center rounded-md px-3 py-1.5 font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                link.brand
                  ? isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-brand hover:bg-brand/5'
                  : isActive
                    ? 'bg-surface-elevated text-foreground'
                    : 'text-foreground-muted hover:bg-surface-elevated hover:text-foreground',
              )}
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
