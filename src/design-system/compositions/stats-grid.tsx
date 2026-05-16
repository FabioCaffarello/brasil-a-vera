import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type StatItem = {
  /** Valor principal — geralmente número grande (ex: '513', 'R$ 1.2bi'). */
  value: ReactNode
  /** Label curta abaixo do valor (caps, foreground-muted). */
  label: string
  /** Hint opcional abaixo do label (foreground-subtle). */
  hint?: ReactNode
}

type StatsGridProps = {
  items: StatItem[]
  className?: string
}

/**
 * StatsGrid — composição da Wave 6 (Sprint 6.0 PR 6).
 *
 * Grid 4-col de stats para overviews/landings (home, partidos,
 * /metodologia). Comparado a `KpiStrip` (PR 4):
 *
 * - Sem ícone (mais minimalista, foco no número)
 * - Sem `tone` semântico (não há sinal de estado — é overview)
 * - Sem border de container (separação só via grid gap + divider)
 * - Valor grande (`text-3xl`) — convida o olhar
 *
 * Server Component. Sem state. Responsivo: 2 cols mobile, cap em
 * `Math.min(items.length, 4)` no md+.
 */
export function StatsGrid({ items, className }: StatsGridProps) {
  if (items.length === 0) return null

  const colsMd = Math.min(items.length, 4)

  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border',
        colsMd === 3 && 'md:grid-cols-3',
        colsMd === 4 && 'md:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 bg-surface px-5 py-6"
        >
          <dt className="font-medium text-foreground-muted text-xs uppercase tracking-wider">
            {item.label}
          </dt>
          <dd className="font-semibold text-3xl text-foreground tracking-tight">
            {item.value}
          </dd>
          {item.hint ? (
            <div className="text-foreground-subtle text-xs">{item.hint}</div>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
