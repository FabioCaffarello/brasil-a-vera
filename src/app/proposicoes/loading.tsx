import { Skeleton } from '@fabio.caffarello/react-design-system/server'

/**
 * Loading skeleton para /proposicoes. A página aguarda um Promise.all
 * (listagem + catálogos + stats + count); o skeleton sinaliza "carregando"
 * enquanto o RSC resolve. Estrutura espelha o layout real: StatGroup (4) +
 * barra de filtros + grid de cards.
 *
 * Pulse respeita prefers-reduced-motion (globals.css §6). Server Component.
 */
export default function ProposicoesLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      {/* StatGroup (4) */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line-default bg-line-default sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            className="flex flex-col gap-2 bg-surface-base px-4 py-5"
            key={i}
          >
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Barra de filtros */}
      <Skeleton className="h-10 w-full" />

      {/* Grid de cards */}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li
            className="rounded-lg border border-line-default bg-surface-base p-4"
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder estático sem identidade
            key={i}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-5/6" />
            <Skeleton className="mt-3 h-2 w-full" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </li>
        ))}
      </ul>
    </div>
  )
}
