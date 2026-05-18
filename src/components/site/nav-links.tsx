'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'

type NavLink = {
  href: string
  label: string
}

export const NAV_LINKS: NavLink[] = [
  { href: '/parlamentares', label: 'Parlamentares' },
  { href: '/proposicoes', label: 'Proposições' },
  { href: '/votacoes', label: 'Votações' },
  { href: '/docs', label: 'Docs' },
]

export function isNavLinkActive(pathname: string | null, href: string) {
  if (href === '/') return pathname === '/'
  return pathname?.startsWith(href) ?? false
}

/**
 * NavLinks — desktop horizontal (≥ md). Mobile usa <NavMobile />.
 *
 * Active state Wave 6 reskin:
 * - Active: bg-foreground/10 ring-1 ring-foreground/10
 *   (substitui bg-surface-elevated que sumia no glass shell)
 * - Idle: text-foreground-muted, hover text-foreground com fill leve
 *
 * Todos os links têm peso visual uniforme — sem diferenciação por área.
 *
 * Active = pathname começa com href (ou exatamente "/" para home).
 * aria-current="page" (WCAG 2.4.8 / 4.1.2).
 *
 * Cliente apenas para usePathname(). Sem outros listeners; bundle ~1KB gzip.
 */
export function NavLinks() {
  const pathname = usePathname()

  return (
    <ul className="hidden items-center gap-0.5 text-sm md:flex">
      {NAV_LINKS.map((link) => {
        const isActive = isNavLinkActive(pathname, link.href)

        return (
          <li key={link.href}>
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center rounded-md px-3 py-1.5 font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-foreground/10 text-foreground ring-1 ring-foreground/10'
                  : 'text-foreground-muted hover:bg-foreground/5 hover:text-foreground',
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
