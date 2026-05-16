import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type DataBadgeTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'accent'
  | 'brand'

type DataBadgeProps = {
  /**
   * Texto principal do badge (ex: 'L2', 'L4', 'AAA', 'Wave 6').
   * Para casos cívicos, geralmente o nível de confiança (L1-L4).
   */
  label: ReactNode
  /**
   * Fonte/origem opcional renderizada como sub-texto após `·`
   * (ex: 'Câmara', 'Senado', 'TSE').
   */
  source?: ReactNode
  /** Ícone opcional à esquerda (geralmente lucide-react). */
  icon?: ReactNode
  /** Tom semântico do badge. */
  tone?: DataBadgeTone
  className?: string
}

const TONE_VARIANTS: Record<DataBadgeTone, string> = {
  default: 'border-border bg-surface text-foreground-muted',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
  accent: 'border-accent/40 bg-accent/10 text-accent',
  brand: 'border-brand/40 bg-brand/10 text-brand',
}

/**
 * DataBadge — composição da Wave 6 (Sprint 6.0 PR 6).
 *
 * Badge genérico de metadado, útil como kicker de hero ou chip
 * narrativo. Domain-agnostic — o consumer escolhe o que `label` e
 * `source` representam (nível de confiança, sprint, tag, etc).
 *
 * Server Component. Token-driven coloring (zero hardcode de hex).
 *
 * Diferença vs `TrustBadge` (em `src/components/trust/`):
 * - `TrustBadge` sabe que L1-L4 mapeiam para níveis de confiança da
 *   pirâmide cívica — domínio acoplado, vive em `components/`.
 * - `DataBadge` é layout puro com `tone` semântico — vive em
 *   `design-system/compositions/`, boundary respeitado.
 *
 * Consumer cívico (`components/trust/trust-badge-data-aware.tsx` por
 * exemplo) PODE compor `DataBadge` com a lógica de mapping L1-L4 →
 * tone, mantendo cada camada no seu boundary.
 */
export function DataBadge({
  label,
  source,
  icon,
  tone = 'default',
  className,
}: DataBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-xs',
        TONE_VARIANTS[tone],
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
      {source ? (
        <>
          <span aria-hidden="true" className="opacity-60">
            ·
          </span>
          <span className="opacity-80">{source}</span>
        </>
      ) : null}
    </span>
  )
}
