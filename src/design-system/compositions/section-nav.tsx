'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'

export type SectionNavItem = {
  /** Anchor id — deve coincidir com `id` de um `<SectionCard>` na página. */
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

/**
 * SectionNav — barra sticky de jump links (Wave 6 Sprint 6.0 PR 5).
 *
 * Client Component (IntersectionObserver para active state). Mobile:
 * scroll horizontal, sticky bar reduzida (D6 do prompt mestre Wave 6 —
 * tabs implicariam swipe conflitando com scroll vertical). Desktop:
 * mesma estrutura, sem scroll.
 *
 * Comportamento:
 * - Renderiza `<a href="#${id}">` para cada item — navegação por
 *   anchor padrão (sem JS adicional)
 * - IntersectionObserver detecta qual seção está em view e marca
 *   o link correspondente como active
 * - rootMargin `-30% 0px -60% 0px` ativa o link quando a seção
 *   cruza ~30% do top (não no scroll exato, evita "flicker"
 *   entre seções adjacentes)
 *
 * Sem framer-motion (ADR-023) — transição via CSS `transition-colors`.
 */
export function SectionNav({
  items,
  stickyTop = '0',
  className,
}: SectionNavProps) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )

    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Seções da página"
      className={cn(
        'sticky z-10 overflow-x-auto py-2',
        'border-border border-b bg-background/80 backdrop-blur',
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-foreground-muted hover:bg-surface-elevated hover:text-foreground',
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
