'use client'

// SectionNav — promovido ao RDS (migração ADR-033). Usa o useScrollSpy do RDS
// via entry granular `/hooks` (#205; 855 bytes standalone, sem o barrel client
// de 488K). rootMargin '-30% 0px -60% 0px' — ativa o link quando a seção cruza
// ~30% do top, evita flicker.
//
// Contrato do hook: retorna null até a primeira interseção (SSR-safe);
// fallback `?? items[0]?.id` mantém o primeiro link ativo no primeiro
// paint, igual ao useState inicial do original.

import { useScrollSpy } from '@fabio.caffarello/react-design-system/hooks'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { cn } from '@/lib/cn'

export type SectionNavItem = {
  /** Anchor id — deve coincidir com `id` de uma seção na página. */
  id: string
  /** Label visível (curta — mobile-first). */
  label: string
  /** Ícone opcional (lucide-react). Renderizado com `aria-hidden`. */
  icon?: ReactNode
}

type SectionNavProps = {
  items: SectionNavItem[]
  /**
   * Top offset para `position: sticky`. CSS value (`'0'`, `'4rem'`,
   * `'calc(var(--navbar-h) + 0.5rem)'`). Default `'0'`.
   */
  stickyTop?: string
  className?: string
}

export function SectionNav({
  items,
  stickyTop = '0',
  className,
}: SectionNavProps) {
  // useScrollSpy exige referência estável de ids (sentinela join
  // interno recria o observer a cada mudança) — useMemo nos derivados.
  const ids = useMemo(() => items.map((item) => item.id), [items])
  const active = useScrollSpy(ids, { rootMargin: '-30% 0px -60% 0px' })
  const activeId = active ?? items[0]?.id ?? null

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Seções da página"
      className={cn(
        'sticky z-10 overflow-x-auto py-2',
        'border-line-default border-b bg-surface-canvas/80 backdrop-blur',
        className,
      )}
      style={{ top: stickyTop }}
    >
      <ul className="flex items-center gap-1 px-4">
        {items.map((item) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas',
                  isActive
                    ? 'bg-fg-brand/10 text-fg-brand'
                    : 'text-fg-tertiary hover:bg-surface-raised hover:text-fg-primary',
                )}
              >
                {item.icon ? (
                  <span aria-hidden="true" className="shrink-0">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
