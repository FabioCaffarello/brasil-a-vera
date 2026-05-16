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

/**
 * FilterChip — chip individual (Wave 6 Sprint 6.0 PR 5).
 *
 * RSC-compatível: estilização sem state interno. Consumer hooka o
 * comportamento (Link, form, etc) via `asChild`, ou usa como
 * `<button>` puro.
 *
 * Estado `selected` é responsabilidade do consumer (geralmente
 * derivado da URL via search params, mantendo URL = state per
 * ADR-018).
 */
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
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    selected
      ? 'border-brand bg-brand/10 text-brand shadow-glow'
      : 'border-border bg-surface text-foreground-muted hover:bg-surface-elevated hover:text-foreground',
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
              ? 'bg-brand/20 text-brand'
              : 'bg-surface-elevated text-foreground-subtle',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

type FilterChipsProps = {
  /** Label visível acima do grupo (ARIA group label). */
  label?: string
  /** Coleção de `<FilterChip>` instances (consumer compõe). */
  children: ReactNode
  className?: string
}

/**
 * FilterChips — wrapper de grupo (Wave 6 Sprint 6.0 PR 5).
 *
 * Container layout-only para uma coleção de `<FilterChip>`. Server
 * Component. Sem state interno. Consumer renderiza cada `<FilterChip>`
 * dentro como `<a>` linkado a URL com search params (mantém URL =
 * state, GET form sem JS, ADR-018).
 */
export function FilterChips({ label, children, className }: FilterChipsProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset>/<legend> traz reset CSS indesejado para nosso layout; div+role=group+aria-label cobre a11y (padrão shadcn, Radix Form).
    <div className={cn('space-y-2', className)} role="group" aria-label={label}>
      {label ? (
        <div className="text-foreground-muted text-sm">{label}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
