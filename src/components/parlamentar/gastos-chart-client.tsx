'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper client para dynamic-import do GastosChart (Wave 7 Sprint 7.4 PR1).
 *
 * Recharts toca `window` no module init (ResponsiveContainer usa
 * ResizeObserver), então o chunk precisa de `ssr: false`. Como `ssr:
 * false` não pode ser usado em Server Components no App Router (Next
 * 16+), este wrapper Client Component faz a ponte: consumidores Server
 * (gastos-resumo.tsx) importam este wrapper.
 *
 * Bundle: o chunk dynamic carrega só quando o componente entra no DOM
 * — ou seja, quando o usuário visita `/parlamentares/[id]`. Não impacta
 * o path anônimo (home, listagem, busca).
 */
// Wave 8 Sprint 8.4 PR2 — redirecionado de './gastos-chart' direto para
// o bundle compartilhado '@/components/charts/recharts-bundle'. Mesmo
// componente renderizado; muda só o resolver do dynamic para que
// Turbopack agrupe Recharts em chunk único compartilhado com o
// ApoioPartidoChart (Wave 8). Antes da mudança: cada wrapper criava
// chunk próprio de Recharts (~62 kB gzip duplicado).
export const GastosChart = dynamic(
  () =>
    import('@/components/charts/recharts-bundle').then((m) => m.GastosChart),
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
