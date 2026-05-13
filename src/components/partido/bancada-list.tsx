import Link from 'next/link'

import type { PartidoMembro } from '@/lib/queries/partidos'

interface Props {
  membros: PartidoMembro[]
}

export function BancadaList({ membros }: Props) {
  if (membros.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem parlamentares registrados nesta sigla.
      </p>
    )
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {membros.map((m) => (
        <li key={m.id}>
          <Link
            href={`/parlamentares/${m.id}`}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2.5 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
            {m.urlFoto ? (
              // biome-ignore lint/performance/noImgElement: foto remota; CLS evitado com width/height.
              <img
                src={m.urlFoto}
                alt=""
                loading="lazy"
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="size-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700"
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {m.nome}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {m.casa === 'CAMARA' ? 'Deputado' : 'Senador'}/{m.uf}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
