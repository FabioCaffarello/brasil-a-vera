import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type HeroVariant = 'gradient' | 'gradient-glow' | 'plain'

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
   * Slot livre para KPIs/badges abaixo das actions. Consumer compõe
   * `<DataBadge>`, `<KpiStrip>` ou similar (mantém boundary do DS:
   * decisão de quê exibir é do consumer; layout é da composição).
   */
  kpis?: ReactNode
  /**
   * - `'gradient'` (default): `.bg-hero` + `.grid-bg` + `.text-gradient` no H1.
   * - `'gradient-glow'`: gradient + 3 blobs animados (CSS puro via
   *   `@keyframes` + `@starting-style`, ADR-023) + accent line.
   * - `'plain'`: hero limpo, consumer controla background.
   */
  variant?: HeroVariant
  className?: string
}

/**
 * HeroSection — composição da Wave 6 (Sprint 6.0 PR 3).
 *
 * Server Component. Sem domínio acoplado (ADR-021 boundary). Configurável
 * via props: `kicker`, `title`, `description`, `actions`, `kpis`, `variant`.
 *
 * Variantes:
 * - `gradient` consome `.bg-hero` + `.grid-bg` + `.text-gradient` (ADR-024)
 *   para entregar a "gravidade visual" do hero do protótipo.
 * - `gradient-glow` adiciona blobs animados via `.hero-glow*` + accent line
 *   + stagger reveal via `.hero-stagger` (CSS puro, ADR-023). Equivalente
 *   ao efeito que protótipos como `framer-motion`-based entregavam com
 *   ~50 kB gzip de JS — aqui sai por 0 kB.
 * - `plain` deixa o consumer escolher o background.
 *
 * Sem framer-motion (ADR-023). Animações usam `@starting-style` + `@keyframes`
 * em `src/app/globals.css §5/5b`. `prefers-reduced-motion` é honrado
 * automaticamente pelo override global em §6.
 */
export function HeroSection({
  kicker,
  title,
  description,
  actions,
  kpis,
  variant = 'gradient',
  className,
}: HeroSectionProps) {
  const isGradient = variant === 'gradient' || variant === 'gradient-glow'
  const isGlow = variant === 'gradient-glow'
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden px-6 py-16 sm:py-20 md:py-24',
        isGradient && 'bg-hero grid-bg',
        isGlow && 'hero-glow',
        className,
      )}
    >
      {isGlow ? (
        <>
          <div
            aria-hidden="true"
            className="hero-glow__blob hero-glow__blob--brand"
          />
          <div
            aria-hidden="true"
            className="hero-glow__blob hero-glow__blob--accent"
          />
          <div
            aria-hidden="true"
            className="hero-glow__blob hero-glow__blob--accent-bottom"
          />
          <div aria-hidden="true" className="hero-glow__accent-line" />
        </>
      ) : null}
      <div
        className={cn('relative mx-auto max-w-3xl', isGlow && 'hero-stagger')}
      >
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
        {kpis ? <div className="mt-10">{kpis}</div> : null}
      </div>
    </section>
  )
}
