import Link from 'next/link'

import { PartyBadge } from '@/design-system/compositions/party-badge'
import { formatDataBR } from '@/lib/format'
import type { RelatorProposicao } from '@/lib/queries/relatorias'

interface Props {
  relatorias: RelatorProposicao[]
}

export function RelatoriasList({ relatorias }: Props) {
  if (relatorias.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">Sem relator designado ainda.</p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {relatorias.map((r) => (
          <li
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            key={r.id}
          >
            <span className="font-medium text-fg-primary">
              {r.parlamentarId ? (
                <Link
                  className="underline decoration-dotted underline-offset-2 hover:text-fg-tertiary"
                  href={`/parlamentares/${r.parlamentarId}`}
                >
                  {r.parlamentarNome ?? r.relatorSourceId}
                </Link>
              ) : (
                (r.parlamentarNome ?? r.relatorSourceId)
              )}
            </span>
            {r.parlamentarPartidoSigla && (
              <PartyBadge sigla={r.parlamentarPartidoSigla} size="sm" />
            )}
            {r.parlamentarUf && (
              <span className="text-fg-tertiary text-xs">
                {r.parlamentarUf}
              </span>
            )}
            <span className="ml-auto text-fg-tertiary text-xs uppercase tracking-wide">
              {r.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
            </span>
            {r.designadoEm && (
              <span className="w-full text-fg-tertiary text-xs">
                Designado em {formatDataBR(r.designadoEm)}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-fg-tertiary text-xs">
        A relatoria é designação da presidência da comissão ou da Mesa — não é
        escolha do parlamentar.
      </p>
    </div>
  )
}
