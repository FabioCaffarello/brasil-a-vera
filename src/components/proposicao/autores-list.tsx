import Link from 'next/link'

import type { AutorDeProposicao } from '@/lib/queries/proposicoes'

interface Props {
  autores: AutorDeProposicao[]
}

export function AutoresList({ autores }: Props) {
  if (autores.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem autores registrados na base.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {autores.map((a) => (
        <li
          key={a.id}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
        >
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {a.parlamentarId ? (
              <Link
                href={`/parlamentares/${a.parlamentarId}`}
                className="underline decoration-dotted underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-400"
              >
                {a.nome}
              </Link>
            ) : (
              a.nome
            )}
          </span>
          {a.parlamentarPartidoSigla && a.parlamentarUf && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({a.parlamentarPartidoSigla}/{a.parlamentarUf})
            </span>
          )}
          <span className="ml-auto text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {a.tipoAutoria === 'AUTOR' ? 'Autor' : 'Coautor'}
          </span>
        </li>
      ))}
    </ul>
  )
}
