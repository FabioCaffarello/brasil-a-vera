// Cópia-rds de src/components/proposicao/autores-list.tsx (piloto-3).
// Server Component. PartyBadge local mantido (composição sem
// equivalente RDS; precedente piloto-2).

import Link from 'next/link'

import { PartyBadge } from '@/design-system/compositions/party-badge'
import type { AutorDeProposicao } from '@/lib/queries/proposicoes'

interface Props {
  autores: AutorDeProposicao[]
}

export function AutoresList({ autores }: Props) {
  if (autores.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem autores registrados na base.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {autores.map((a) => (
        <li
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
          key={a.id}
        >
          <span className="font-medium text-fg-primary">
            {a.parlamentarId ? (
              <Link
                className="underline decoration-dotted underline-offset-2 hover:text-fg-tertiary"
                href={`/parlamentares/${a.parlamentarId}`}
              >
                {a.nome}
              </Link>
            ) : (
              a.nome
            )}
          </span>
          {a.parlamentarPartidoSigla && (
            <PartyBadge sigla={a.parlamentarPartidoSigla} size="sm" />
          )}
          {a.parlamentarUf && (
            <span className="text-fg-tertiary text-xs">{a.parlamentarUf}</span>
          )}
          <span className="ml-auto text-fg-tertiary text-xs uppercase tracking-wide">
            {a.tipoAutoria === 'AUTOR' ? 'Autor' : 'Coautor'}
          </span>
        </li>
      ))}
    </ul>
  )
}
