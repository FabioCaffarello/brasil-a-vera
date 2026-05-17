import { cn } from '@/lib/cn'

export type KpiCardItem = {
  /** Label curta abaixo do valor (ex: "Deputados Federais"). */
  label: string
  /**
   * Valor principal pré-formatado pelo consumer. A composição NÃO
   * formata números — receba `"513"`, `"+250k"` ou `"Diária"` já
   * pronto. Mantém o boundary do design system (sem acoplamento
   * a `formatNumeroAbreviado` ou Intl.NumberFormat).
   */
  value: string
  /** Microcopia opcional (ex: trust level, frequência, fonte). */
  hint?: string
}

export type KpiCardProps = {
  /** Lista de KPIs a exibir. Tamanho esperado: 2-6. */
  items: KpiCardItem[]
  className?: string
  /** Aria-label do `role="list"` wrapper. */
  'aria-label'?: string
}

/**
 * KpiCard — composição da Wave 6 (Sprint 6.0 spike PR).
 *
 * Card de KPIs em surface elevated, otimizado para o hero da home.
 * Diferente de `KpiStrip` em três pontos:
 *
 * - Surface elevada (`bg-surface-elevated`) — destacado contra o hero.
 * - Valores em escala maior (`text-3xl` → `text-5xl` desktop) — peso
 *   narrativo de "métrica de produto", não chip de meta.
 * - Layout fixo em 4 colunas md+ (cap implícito via `grid-cols-4`).
 *
 * Server Component. Sem state. Sem domínio (consumer pré-formata o
 * valor). Token-driven — zero hardcode de cor (ADR-021).
 *
 * Acessibilidade: `<ul>/<li>` semantic + `role="list"` explícito no
 * `<ul>` para preservar anúncio em Safari/VoiceOver após o reset
 * `list-style: none` do Tailwind v4 preflight (issue conhecida).
 */
export function KpiCard({
  items,
  className,
  'aria-label': ariaLabel,
}: KpiCardProps) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface-elevated px-6 py-5 sm:py-6',
        className,
      )}
    >
      <ul
        aria-label={ariaLabel}
        className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-border"
        // biome-ignore lint/a11y/noRedundantRoles: role="list" redundante intencional. Tailwind v4 preflight aplica `list-style: none` no <ul>, o que faz Safari/VoiceOver deixar de anunciar a lista (issue bem documentada). Apple recomenda explicitamente `role="list"` para restaurar o anúncio.
        role="list"
      >
        {items.map((item) => (
          <li className="px-2 text-center sm:px-4" key={item.label}>
            <div className="font-semibold text-3xl text-foreground tabular-nums sm:text-4xl md:text-5xl">
              {item.value}
            </div>
            <div className="mt-1 font-medium text-foreground-muted text-xs sm:text-sm">
              {item.label}
            </div>
            {item.hint ? (
              <div className="mt-0.5 text-[10px] text-foreground-muted/70">
                {item.hint}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
