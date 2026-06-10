'use client'

// Cópia-rds de src/design-system/compositions/section-nav.tsx (piloto-2).
// Tokens traduzidos pela tabela canônica; lógica IntersectionObserver
// EXATA preservada.
//
// NOTA (decisão empírica, princípio 13): o RDS 3.6.0 expõe useScrollSpy
// como hook público (#167) e a primeira versão desta cópia o consumia.
// Medição em build de produção mostrou que importar o hook puxa o barrel
// client INTEIRO do RDS para o chunk da rota: +277.593 bytes minificados
// (JS total da rota: 950.758 → 1.228.157 bytes, +29%) contendo
// ColorPicker, CommandPalette, DataGrid, DatePicker, FormWizard etc. —
// o dist é bundle único com banner "use client", opaco pra tree-shaking.
// Issue upstream pedindo entry granular: RDS #203. Swap quando fechar.
// Ver PR piloto-2 para o output literal da medição.

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

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
