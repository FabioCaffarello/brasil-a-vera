// Cópia-rds de src/design-system/compositions/kpi-card.tsx — onda HeroSection
// (home /). MANTIDA LOCAL (não adotada do RDS) por decisão de scoping
// aprovada pelo owner (opção A):
//
// O `Stat`/`StatGroup` do RDS /server cobre icon/value/label/hint/align mas
// NÃO tem slot para o `floatingBadge` (TrustBadge L1 sobreposto à borda do
// card) e renderiza um "strip dividido" (células bg-surface-base + dividers
// 1px) em vez do "card elevado com gutters de whitespace" desta composição.
// Adotá-lo perderia o selo L1 e mudaria o visual da rota mais visível —
// regressão de produto. Mesma régua já consolidada para apresentacional cujo
// equivalente RDS não cobre a API (EmptyState/Button/DataBadge locais nas
// ondas #1–#3). Server Component puro sem hooks → mantém zero-JS (ADR-022).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   border-border          → border-line-default
//   bg-surface-elevated    → bg-surface-raised
//   text-foreground        → text-fg-primary
//   text-foreground-muted  → text-fg-tertiary
// floatingBadge, surface elevada, gutters (gap-x) e type scale preservados
// idênticos ao original. Original INTOCADO.

import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type KpiCardItem = {
  /**
   * Ícone acima do valor (geralmente `lucide-react`, ex: `<Users>`,
   * `<FileText>`, `<Vote>`, `<Clock>`). Quando usado, recomenda-se
   * aplicar a todos os items do mesmo card — a consistência da
   * "linha de ícones" é o que entrega o ganho de scan visual. Item
   * sem ícone renderiza sem o container (sem espaço reservado).
   */
  icon?: ReactNode
  /** Label curta abaixo do valor (ex: "Parlamentares"). */
  label: string
  /**
   * Valor principal pré-formatado pelo consumer. A composição NÃO
   * formata números — receba `"513"`, `"+250k"` ou `"Diária"` já
   * pronto. Mantém o boundary do design system (sem acoplamento
   * a `formatNumeroAbreviado` ou Intl.NumberFormat).
   */
  value: string
  /**
   * Slot livre abaixo do label — trust badge, fonte, delta de
   * tendência, etc. Consumer controla o shape: pode ser string
   * crua, `<DataBadge>`, span estilizado, ou qualquer ReactNode.
   * Renderizado com `text-xs` (legível, não-decorativo).
   */
  hint?: ReactNode
}

export type KpiCardProps = {
  /** Lista de KPIs a exibir. Tamanho esperado: 2-6. */
  items: KpiCardItem[]
  className?: string
  /** Aria-label do `role="list"` wrapper. */
  'aria-label'?: string
  /**
   * Badge flutuante na borda superior do card (posicionado centralizado
   * sobrepondo a borda). Pensado para sinais de procedência globais —
   * ex.: `<TrustBadge trustLevel="L1" />` indicando que TODOS os KPIs
   * do card têm o mesmo trust level. Quando presente, o card ganha
   * `pt-10` para acomodar o badge sem colidir com a primeira linha de
   * ícones. Consumer escolhe o shape (qualquer ReactNode).
   */
  floatingBadge?: ReactNode
}

/**
 * KpiCard — composição da Wave 6 (Sprint 6.0 spike PR).
 *
 * Card de KPIs em surface elevated, otimizado para o hero da home.
 * Diferente de `KpiStrip` em quatro pontos:
 *
 * - Surface elevada (`bg-surface-raised`) — destacado contra o hero.
 * - Icon top → value → label → hint em vertical com ritmo uniforme
 *   (vs strip horizontal). Ícone anchora cada KPI visualmente.
 * - Type scale calibrada para densidade 4-col (`text-2xl` →
 *   `text-3xl` no sm+), evitando o salto brutal para `text-5xl`.
 * - Whitespace gutters (`gap-x`) em vez de `divide-x` — leitura
 *   menos fragmentada, padrão moderno para data cards.
 *
 * Server Component. Sem state. Sem domínio (consumer pré-formata o
 * valor; consumer escolhe ícones e shape do hint). Token-driven —
 * zero hardcode de cor (ADR-021).
 *
 * Acessibilidade: `<ul>/<li>` semantic + `role="list"` explícito no
 * `<ul>` para preservar anúncio em Safari/VoiceOver após o reset
 * `list-style: none` do Tailwind v4 preflight (issue conhecida).
 * Ícones decorativos (`aria-hidden`) — label + value já carregam o
 * significado para screen readers.
 */
export function KpiCard({
  items,
  className,
  'aria-label': ariaLabel,
  floatingBadge,
}: KpiCardProps) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-line-default bg-surface-raised px-6 py-6 sm:py-8',
        floatingBadge && 'pt-10',
        className,
      )}
    >
      {floatingBadge ? (
        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2 z-10">
          {floatingBadge}
        </div>
      ) : null}
      <ul
        aria-label={ariaLabel}
        className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-0"
        // biome-ignore lint/a11y/noRedundantRoles: role="list" redundante intencional. Tailwind v4 preflight aplica `list-style: none` no <ul>, o que faz Safari/VoiceOver deixar de anunciar a lista (issue bem documentada). Apple recomenda explicitamente `role="list"` para restaurar o anúncio.
        role="list"
      >
        {items.map((item) => (
          <li
            className="flex flex-col items-center gap-2 px-2 text-center sm:px-4"
            key={item.label}
          >
            {item.icon ? (
              <div aria-hidden="true" className="text-fg-tertiary">
                {item.icon}
              </div>
            ) : null}
            <div className="font-semibold text-2xl text-fg-primary tabular-nums sm:text-3xl">
              {item.value}
            </div>
            <div className="font-medium text-fg-tertiary text-sm">
              {item.label}
            </div>
            {item.hint ? (
              <div className="mt-1 text-fg-tertiary text-xs">{item.hint}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
