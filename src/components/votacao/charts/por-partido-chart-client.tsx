'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper client para dynamic-import do VotacaoPorPartidoChart —
 * Wave 9 Sprint 9.3 PR2. Aponta para `recharts-bundle.tsx` (chunk
 * Recharts compartilhado entre rotas).
 */
export const VotacaoPorPartidoChart = dynamic(
  () =>
    import('@/components/charts/recharts-bundle').then(
      (m) => m.VotacaoPorPartidoChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="w-full animate-pulse rounded-md bg-surface-elevated"
        style={{ height: 280 }}
      />
    ),
  },
)
