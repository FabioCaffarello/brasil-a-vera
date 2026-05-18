'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper client para dynamic-import do ApoioPartidoChart — Wave 8
 * Sprint 8.4 PR2. Espelha o padrão estabelecido pelo gastos-chart-client
 * da Wave 7.
 *
 * Recharts toca `window` no module init (ResponsiveContainer usa
 * ResizeObserver), então o chunk precisa de `ssr: false`. Como
 * `ssr: false` não pode ser usado em Server Components no App Router
 * (Next 16+), este wrapper Client Component faz a ponte: consumidores
 * Server (page.tsx do detalhe) importam este wrapper.
 *
 * Bundle: o chunk dynamic carrega só quando o componente entra no DOM
 * — ou seja, quando o usuário visita o detalhe de proposição. Não
 * impacta o path anônimo (home, listagem, busca).
 *
 * Split por chart (vs wrapper genérico do PR1): cada gráfico carrega
 * seu próprio chunk, permitindo render independente por seção
 * semântica (este na SectionCard "Autores"; o donut do PR3 entrará
 * na SectionCard "Votações vinculadas").
 */
// Aponta para o bundle compartilhado (recharts-bundle.tsx) em vez de
// importar './apoio-partido-chart' direto — isso permite que Turbopack
// agrupe Recharts em UM chunk único compartilhado com GastosChart
// (Wave 7), evitando duplicação de ~62 kB gzip por chunk.
export const ApoioPartidoChart = dynamic(
  () =>
    import('@/components/charts/recharts-bundle').then(
      (m) => m.ApoioPartidoChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="h-64 w-full animate-pulse rounded-md bg-surface-elevated"
      />
    ),
  },
)
