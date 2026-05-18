'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper client para dynamic-import do VotosConsolidadosChart — Wave 8
 * Sprint 8.4 PR3. Aponta para `recharts-bundle.tsx` (mesmo chunk
 * compartilhado com GastosChart e ApoioPartidoChart) — Turbopack
 * agrupa Recharts em UM chunk único.
 *
 * Bundle: o chunk dynamic carrega só quando o componente entra no DOM
 * (usuário visita o detalhe de proposição com >0 votações). Reusa o
 * chunk já carregado quando vier de outro chart na mesma sessão.
 */
export const VotosConsolidadosChart = dynamic(
  () =>
    import('@/components/charts/recharts-bundle').then(
      (m) => m.VotosConsolidadosChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="h-44 w-full animate-pulse rounded-md bg-surface-elevated"
      />
    ),
  },
)
