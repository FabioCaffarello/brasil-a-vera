'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper client para dynamic-import do DisciplinaPartidariaChart —
 * Wave 9 Sprint 9.4 PR1. Aponta para `recharts-bundle.tsx` (chunk
 * Recharts compartilhado entre rotas).
 */
export const DisciplinaPartidariaChart = dynamic(
  () =>
    import('@/components/charts/recharts-bundle').then(
      (m) => m.DisciplinaPartidariaChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="w-full animate-pulse rounded-md bg-surface-elevated"
        style={{ height: 200 }}
      />
    ),
  },
)
