import { Skeleton } from '@fabio.caffarello/react-design-system/server'

/**
 * Loading skeleton para /parlamentares. A página inteira aguarda um
 * Promise.all (listagem + catálogos + stats); o skeleton sinaliza
 * "carregando" enquanto o RSC resolve. Estrutura espelha o layout real:
 * hero + StatGroup (3) + barra de filtros + grid de cards.
 *
 * Pulse respeita prefers-reduced-motion (globals.css §6). Server Component.
 */
export default function ParlamentaresLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* StatGroup (3) */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line-default bg-line-default">
        {[0, 1, 2].map((i) => (
          <div
            className="flex flex-col gap-2 bg-surface-base px-4 py-5"
            key={i}
          >
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Barra de filtros */}
      <Skeleton className="h-10 w-full" />

      {/* Grid de cards */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li
            className="rounded-lg border border-line-default bg-surface-base p-4"
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder estático sem identidade
            key={i}
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-14 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-3 h-1.5 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </li>
        ))}
      </ul>
    </div>
  )
}
