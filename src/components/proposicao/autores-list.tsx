import Link from 'next/link'

import type { AutorDeProposicao } from '@/lib/queries/proposicoes'

interface Props {
  autores: AutorDeProposicao[]
}

export function AutoresList({ autores }: Props) {
  if (autores.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Sem autores registrados na base.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {autores.map((a) => (
        <li
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
          key={a.id}
        >
          <span className="font-medium text-foreground">
            {a.parlamentarId ? (
              <Link
                className="underline decoration-dotted underline-offset-2 hover:text-foreground-muted"
                href={`/parlamentares/${a.parlamentarId}`}
              >
                {a.nome}
              </Link>
            ) : (
              a.nome
            )}
          </span>
          {a.parlamentarPartidoSigla && a.parlamentarUf && (
            <span className="text-foreground-muted text-xs">
              ({a.parlamentarPartidoSigla}/{a.parlamentarUf})
            </span>
          )}
          <span className="ml-auto text-foreground-muted text-xs uppercase tracking-wide">
            {a.tipoAutoria === 'AUTOR' ? 'Autor' : 'Coautor'}
          </span>
        </li>
      ))}
    </ul>
  )
}
