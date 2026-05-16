import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type HeroSectionProps = {
  /**
   * Pequeno badge/kicker acima do título — costuma carregar ícone
   * (ex: Sparkles do lucide) + label de contexto narrativo.
   */
  kicker?: ReactNode
  /** Título principal — renderizado como `<h1>`. */
  title: ReactNode
  /** Texto descritivo abaixo do título. */
  description?: ReactNode
  /** CTAs ou outros elementos interativos abaixo da descrição. */
  actions?: ReactNode
  /**
   * `'gradient'` (default) aplica `.bg-hero` + `.grid-bg` + `.text-gradient`
   * no H1. `'plain'` deixa o hero limpo (consumer controla o background).
   */
  variant?: 'gradient' | 'plain'
  className?: string
}

/**
 * HeroSection — composição da Wave 6 (Sprint 6.0 PR 3).
 *
 * Server Component. Sem domínio acoplado (ADR-021 boundary). Configurável
 * via props: `kicker`, `title`, `description`, `actions`, `variant`.
 *
 * Variante `gradient` consome os utilitários `.bg-hero` + `.grid-bg` +
 * `.text-gradient` (ADR-024) para entregar a "gravidade visual" do hero
 * do protótipo. Variante `plain` deixa o consumer escolher o background.
 *
 * Sem framer-motion (ADR-023). Animações de entrada futuras devem usar
 * CSS `@starting-style` + transição, sem JS adicional.
 */
export function HeroSection({
  kicker,
  title,
  description,
  actions,
  variant = 'gradient',
  className,
}: HeroSectionProps) {
  const isGradient = variant === 'gradient'
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden px-6 py-16 sm:py-20 md:py-24',
        isGradient && 'bg-hero grid-bg',
        className,
      )}
    >
      <div className="mx-auto max-w-3xl">
        {kicker ? (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-foreground-muted text-sm">
            {kicker}
          </div>
        ) : null}
        <h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-5xl md:text-6xl">
          {isGradient ? <span className="text-gradient">{title}</span> : title}
        </h1>
        {description ? (
          <p className="mt-6 text-foreground-muted text-lg">{description}</p>
        ) : null}
        {actions ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  )
}
