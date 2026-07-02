import { Skeleton } from '@fabio.caffarello/react-design-system/server'

/**
 * Loading skeleton para /votacoes. A página aguarda um Promise.all (listagem
 * + catálogo de anos + stats + count); o skeleton sinaliza "carregando"
 * enquanto o RSC resolve. Estrutura espelha o layout real: StatGroup (4) +
 * barra de filtros + grid de cards (md:2-col, como o VotacaoCard).
 *
 * Pareia /votacoes com /parlamentares e /proposições, que já têm loading.tsx
 * (antes a votação era a única sem). Como efeito colateral, o redirect 308 de
 * cursor inválido passa a ser soft (streaming), igual às outras duas — fim do
 * 200-vs-308 divergente entre as listagens.
 *
 * Pulse respeita prefers-reduced-motion (globals.css §6). Server Component.
 */
export default function VotacoesLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      {/* StatGroup (4, com hint) */}
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

      {/* Grid de cards (md:2-col, como a listagem real) */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <li
            className="rounded-lg border border-line-default bg-surface-base p-4"
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder estático sem identidade
            key={i}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-4/5" />
            <Skeleton className="mt-3 h-3 w-2/3" />
          </li>
        ))}
      </ul>
    </div>
  )
}
