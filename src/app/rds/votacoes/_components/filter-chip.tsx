// Cópia-rds do item FilterChip de src/design-system/compositions/filter-chips.tsx
// — onda HeroSection (listagem /votacoes). Reuso verbatim das cópias das
// listagens /parlamentares e /proposicoes (apresentacional puro, sem
// href/rota embutida).
//
// Decisão §3.9 (varredura 3.10.0, owner): o wrapper FilterChips vem do
// RDS /server (server-safe); o item FilterChip permanece LOCAL. O Chip
// do RDS é client (+5.759 bytes/rota medidos) e os chips são <Link>
// (navegação por URL) — JS que não compra função, contra ADR-022.
//
// Original INTOCADO. Tradução EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   ring-ring                → ring-line-focus
//   ring-offset-background   → ring-offset-surface-canvas
//   border-brand bg-brand/10 text-brand → border-fg-brand bg-fg-brand/10 text-fg-brand
//       (base brand byte-idêntica pós-#358; generalização piloto-5)
//   border-border            → border-line-default
//   bg-surface               → bg-surface-base
//   text-foreground-muted    → text-fg-tertiary
//   bg-surface-elevated      → bg-surface-raised
//   text-foreground          → text-fg-primary
//   bg-brand/20 text-brand   → bg-fg-brand/20 text-fg-brand
//   text-foreground-subtle   → text-fg-quaternary
//
// Token MANTIDO (resíduo, ADR-024, sem par RDS): shadow-glow.

import { Slot } from '@radix-ui/react-slot'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type FilterChipProps = {
  /** Marca o chip como selecionado (estilo destacado). */
  selected?: boolean
  /**
   * Contagem opcional renderizada como sub-badge à direita.
   * Apenas no modo `<button>` (default). Em modo `asChild`, o consumer
   * é responsável por renderizar a contagem dentro do próprio elemento.
   */
  count?: number
  /**
   * Renderiza como Slot (polimórfico) — útil para envolver `<Link>` ou
   * `<a>`. O filho deve ser um único elemento React. `count` é
   * ignorado neste modo (limitação do Slot do Radix).
   */
  asChild?: boolean
  /** Conteúdo do chip (label + ícone opcional). */
  children: ReactNode
  className?: string
}

export function FilterChip({
  selected,
  count,
  asChild,
  children,
  className,
}: FilterChipProps) {
  const Comp = asChild ? Slot : 'button'
  const chipClasses = cn(
    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium text-sm transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas',
    selected
      ? 'border-fg-brand bg-fg-brand/10 text-fg-brand shadow-glow'
      : 'border-line-default bg-surface-base text-fg-tertiary hover:bg-surface-raised hover:text-fg-primary',
    className,
  )

  if (asChild) {
    // Slot exige um único filho — consumer é responsável pelo layout interno.
    return (
      <Comp
        data-selected={selected ? 'true' : undefined}
        className={chipClasses}
      >
        {children}
      </Comp>
    )
  }

  return (
    <button
      type="button"
      data-selected={selected ? 'true' : undefined}
      aria-pressed={Boolean(selected)}
      className={chipClasses}
    >
      <span className="shrink-0">{children}</span>
      {count !== undefined ? (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 font-medium text-xs',
            selected
              ? 'bg-fg-brand/20 text-fg-brand'
              : 'bg-surface-raised text-fg-quaternary',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
