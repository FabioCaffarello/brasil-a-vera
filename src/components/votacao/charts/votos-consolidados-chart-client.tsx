'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper client para dynamic-import do VotacaoVotosConsolidadosChart —
 * Wave 9 Sprint 9.3 PR1. Aponta para `recharts-bundle.tsx` (mesmo chunk
 * compartilhado com GastosChart, ApoioPartidoChart,
 * VotosConsolidadosChart Wave 8) — Turbopack agrupa Recharts em UM
 * chunk único e reusa entre rotas.
 */
export const VotacaoVotosConsolidadosChart = dynamic(
  () =>
    import('@/components/charts/recharts-bundle').then(
      (m) => m.VotacaoVotosConsolidadosChart,
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
