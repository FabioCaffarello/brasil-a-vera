import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type HeroVariant = 'gradient' | 'gradient-glow' | 'plain'
export type HeroAlign = 'start' | 'center'

type HeroSectionProps = {
  /**
   * Pequeno badge/kicker acima do título. **Consumer é responsável
   * pelo shape visual** — passe um `<DataBadge>` pronto, um
   * `<span>` estilizado, ou texto cru. A composição apenas envolve
   * em um wrapper de spacing (`mb-4`), sem aplicar pill/border.
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
   * `<DataBadge>`, `<KpiStrip>`, `<KpiCard>` ou similar (mantém
   * boundary do DS: decisão de quê exibir é do consumer; layout é
   * da composição).
   */
  kpis?: ReactNode
  /**
   * Slot de meta-info sobre o produto, renderizado após `kpis` em
   * uma linha de pills centralizada (ex: "Dados oficiais ·
   * Atualização diária · API pública"). Conceitualmente distinto de
   * `kpis`: pills narrativas em vez de métricas numéricas.
   */
  meta?: ReactNode
  /**
   * - `'plain'` (default, Wave 8 P8): hero limpo, consumer controla
   *   background. Uniformidade visual entre eixos — identidade do produto
   *   é discrição editorial, conteúdo carrega a presença.
   * - `'gradient'`: `.bg-hero` + `.grid-bg` + `.text-gradient` no H1.
   *   Disponível no DS mas vedado em rotas de produto sem novo ADR.
   * - `'gradient-glow'`: gradient + 3 blobs animados (CSS puro via
   *   `@keyframes` + `@starting-style`, ADR-023) + accent line. Mesma
   *   restrição de uso da variante gradient.
   */
  variant?: HeroVariant
  /**
   * Alinhamento horizontal do conteúdo interno (kicker, h1,
   * description, actions). Default `'start'` (esquerda) — preserva
   * consumers existentes (busca, comparar, perfil).
   * `'center'` centraliza tudo — combina bem com `variant='plain'`
   * em heros minimalistas onde a ausência de fundo decorativo pede
   * equilíbrio simétrico. O slot `meta` é sempre centralizado,
   * independente desta prop.
   */
  align?: HeroAlign
  className?: string
}

/**
 * HeroSection — composição da Wave 6 (Sprint 6.0 PR 3).
 *
 * Server Component. Sem domínio acoplado (ADR-021 boundary). Configurável
 * via props: `kicker`, `title`, `description`, `actions`, `kpis`, `variant`.
 *
 * Variantes (Wave 8 — P8 uniformidade visual entre eixos):
 * - `plain` (default): deixa o consumer escolher o background.
 *   Padrão universal em rotas de produto. Densidade narrativa vem do
 *   conteúdo (StatsGrid, KpiStrip, DataBadges), não do fundo decorativo.
 * - `gradient`: `.bg-hero` + `.grid-bg` + `.text-gradient` (ADR-024).
 *   Disponível no DS para uso futuro condicional; vedado em rotas de
 *   produto sem novo ADR.
 * - `gradient-glow`: gradient + blobs animados via `.hero-glow*` + accent
 *   line + stagger reveal via `.hero-stagger` (CSS puro, ADR-023).
 *   Mesma restrição de uso.
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
  meta,
  variant = 'plain',
  align = 'start',
  className,
}: HeroSectionProps) {
  const isGradient = variant === 'gradient' || variant === 'gradient-glow'
  const isGlow = variant === 'gradient-glow'
  const isCenter = align === 'center'
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
        className={cn(
          'relative mx-auto max-w-3xl',
          isCenter && 'text-center',
          isGlow && 'hero-stagger',
        )}
      >
        {kicker ? (
          <div className={cn('mb-4', isCenter && 'flex justify-center')}>
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
          <div
            className={cn(
              'mt-8 flex flex-wrap items-center gap-3',
              isCenter && 'justify-center',
            )}
          >
            {actions}
          </div>
        ) : null}
        {kpis ? <div className="mt-10">{kpis}</div> : null}
        {meta ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {meta}
          </div>
        ) : null}
      </div>
    </section>
  )
}
