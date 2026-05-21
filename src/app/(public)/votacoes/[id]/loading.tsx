import { Skeleton } from '@/design-system/primitives/skeleton'

/**
 * Loading skeleton para /votacoes/[id] — Wave 9 Sprint 9.5 PR2.
 *
 * Estrutura espelha o layout real do page.tsx em forma esqueletal:
 * - Breadcrumb sutil
 * - Header card (badges + h1 + trust + share)
 * - KpiStrip 4 slots
 * - SectionCard "Resumo" (donut placeholder + tabela)
 *
 * Pulse animation respeita prefers-reduced-motion (via globals.css §6).
 * Server Component — renderiza enquanto Next aguarda data fetch.
 */
export default function VotacaoLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-5">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-20" />

        {/* Header */}
        <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="mb-2 h-8 w-full" />
          <Skeleton className="mb-4 h-8 w-3/4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="mt-4 pt-3">
            <Skeleton className="h-9 w-36" />
          </div>
        </div>

        {/* KpiStrip 4 slots */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div className="flex flex-col gap-2 bg-surface px-4 py-5" key={i}>
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* SectionCard placeholder (apenas Resumo — o suficiente para
          sinalizar "carregando", sem inflar payload do skeleton). */}
      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-3 h-44 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
