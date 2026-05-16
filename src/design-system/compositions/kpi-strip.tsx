import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type KpiTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'muted'

export type KpiItem = {
  /** Ícone opcional acima do valor (geralmente lucide-react). */
  icon?: ReactNode
  /** Label curta abaixo do valor (caps, foreground-muted). */
  label: string
  /** Valor principal — geralmente número ou string curta. */
  value: ReactNode
  /** Texto auxiliar abaixo do label, colorido conforme `tone`. */
  hint?: ReactNode
  /** Tom semântico do hint. `default` = foreground-muted. */
  tone?: KpiTone
}

type KpiStripProps = {
  items: KpiItem[]
  className?: string
}

const TONE_HINT_CLASSES: Record<KpiTone, string> = {
  default: 'text-foreground-muted',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-foreground-subtle',
}

/**
 * KpiStrip — composição da Wave 6 (Sprint 6.0 PR 4).
 *
 * Strip horizontal de KPIs sem domínio acoplado. Configurável via array
 * `items` de `KpiItem`. Layout responsivo: 1 col mobile, 2 sm, N md+
 * onde N = `Math.min(items.length, 4)` (cap a 4 colunas para evitar
 * fragmentação visual em strips grandes).
 *
 * Server Component. Sem state. Hint colorido por `tone` semântico
 * (sem hardcode de cores — sempre via token `--success`/`--warning`/etc).
 */
export function KpiStrip({ items, className }: KpiStripProps) {
  if (items.length === 0) return null

  const colsMd = Math.min(items.length, 4)

  return (
    <div
      className={cn(
        'grid divide-y divide-border rounded-lg border border-border bg-surface',
        'sm:grid-cols-2 sm:divide-x sm:divide-y-0',
        colsMd === 3 && 'md:grid-cols-3',
        colsMd === 4 && 'md:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <KpiCell key={item.label} item={item} />
      ))}
    </div>
  )
}

function KpiCell({ item }: { item: KpiItem }) {
  const tone = item.tone ?? 'default'
  return (
    <div className="flex flex-col gap-1 px-4 py-5 sm:px-5">
      {item.icon ? (
        <div className="mb-1 text-foreground-muted" aria-hidden="true">
          {item.icon}
        </div>
      ) : null}
      <div className="font-semibold text-2xl text-foreground tracking-tight">
        {item.value}
      </div>
      <div className="text-foreground-muted text-sm">{item.label}</div>
      {item.hint ? (
        <div className={cn('text-xs', TONE_HINT_CLASSES[tone])}>
          {item.hint}
        </div>
      ) : null}
    </div>
  )
}
