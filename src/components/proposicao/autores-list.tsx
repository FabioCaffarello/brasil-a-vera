import Link from 'next/link'

import { PartyBadge } from '@/design-system/compositions/party-badge'
import type { AutorDeProposicao } from '@/lib/queries/proposicoes'

interface Props {
  autores: AutorDeProposicao[]
}

/**
 * Lista de autores de uma proposição — Wave 6 + Wave 8 Sprint 8.2 PR2
 * (decisão inline #5 do plano: usar PartyBadge para autores parlamentares).
 *
 * Antes mostrava sigla/UF como texto cru ("PT/SP"). Agora autores
 * parlamentares ganham PartyBadge colorido (cor por sigla) + UF como
 * texto subtle. Autores não-parlamentares (Mesa, Comissão, Senado
 * Federal etc) seguem sem badge.
 */
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
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
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
          {a.parlamentarPartidoSigla && (
            <PartyBadge sigla={a.parlamentarPartidoSigla} size="sm" />
          )}
          {a.parlamentarUf && (
            <span className="text-foreground-muted text-xs">
              {a.parlamentarUf}
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
