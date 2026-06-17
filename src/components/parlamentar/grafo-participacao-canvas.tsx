'use client'

import dynamic from 'next/dynamic'

// Wrapper client para dynamic-import do canvas ReactFlow (mesmo padrão do
// bundle Recharts — ADR-034 §5 / ADR-037 §5). ReactFlow toca `window`
// (ResizeObserver) no init, então precisa de `ssr: false`; e o chunk só carrega
// quando o perfil é visitado — zero peso no path anônimo.
export const GrafoParticipacaoCanvas = dynamic(
  () =>
    import('./grafo-participacao-flow').then((m) => m.GrafoParticipacaoFlow),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="h-96 w-full animate-pulse rounded-lg bg-surface-elevated"
      />
    ),
  },
)
