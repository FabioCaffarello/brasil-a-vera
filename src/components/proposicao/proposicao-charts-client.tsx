'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper client para dynamic-import do ProposicaoCharts (Wave 8 Sprint
 * 8.4 PR1). Espelha o padrão estabelecido pelo gastos-chart-client da
 * Wave 7 — single source of truth do pattern de Recharts no projeto.
 *
 * Recharts toca `window` no module init (ResponsiveContainer usa
 * ResizeObserver), então o chunk precisa de `ssr: false`. Como
 * `ssr: false` não pode ser usado em Server Components no App Router
 * (Next 16+), este wrapper Client Component faz a ponte: consumidores
 * Server (page.tsx do detalhe da proposição) importam este wrapper.
 *
 * Bundle: o chunk dynamic carrega só quando o componente entra no DOM
 * — ou seja, quando o usuário visita `/proposicoes/[…]` E há dados
 * para chart. Não impacta o path anônimo (home, listagem, busca).
 *
 * No PR1 (este), Recharts ainda não está importado no chart-container
 * (proposicao-charts.tsx), então o chunk dynamic seria vazio. PR2
 * introduz Recharts via o primeiro chart concreto.
 */
export const ProposicaoCharts = dynamic(
  () => import('./proposicao-charts').then((m) => m.ProposicaoCharts),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="h-72 w-full animate-pulse rounded-md bg-surface-elevated"
      />
    ),
  },
)
