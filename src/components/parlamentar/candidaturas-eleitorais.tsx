import { Card } from '@fabio.caffarello/react-design-system/server'
import { Vote } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import type { CandidaturaTse } from '@/lib/queries/candidaturas'

interface Props {
  candidaturas: CandidaturaTse[]
}

function situacaoClass(situacao: string): string {
  const s = situacao.toUpperCase()
  if (s.startsWith('ELEITO')) return 'text-green-700 dark:text-green-400'
  if (s === 'SUPLENTE') return 'text-amber-700 dark:text-amber-400'
  return 'text-fg-tertiary'
}

function formatCargo(dsCargo: string): string {
  return dsCargo.toLowerCase().replace(/\b(\w)/g, (c) => c.toUpperCase())
}

function formatSituacao(situacao: string): string {
  return situacao.toLowerCase().replace(/\b(\w)/g, (c) => c.toUpperCase())
}

export function CandidaturasEleitorais({ candidaturas }: Props) {
  if (candidaturas.length === 0) {
    return (
      <EmptyState
        icon={Vote}
        title="Nenhuma candidatura vinculada"
        description="O vínculo com a base do TSE é feito por CPF exato. Este parlamentar não foi identificado nas declarações eleitorais disponíveis."
      />
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {candidaturas.map((c) => (
          <li key={c.id}>
            <Card padding="none" className="p-3" variant="default">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-fg-tertiary text-xs tabular-nums">
                  {c.anoEleicao}
                </span>
                <span className="font-medium text-fg-primary text-sm">
                  {formatCargo(c.dsCargo)}
                </span>
                <span className="text-fg-secondary text-sm">{c.sgUf}</span>
                <span
                  className={`ml-auto text-xs font-medium ${situacaoClass(c.dsSituacaoCandidatura)}`}
                >
                  {formatSituacao(c.dsSituacaoCandidatura)}
                </span>
              </div>
              {c.qtVotosNominais != null &&
                c.dsSituacaoCandidatura.toUpperCase().startsWith('ELEITO') && (
                  <p className="mt-0.5 text-fg-tertiary text-xs tabular-nums">
                    {c.qtVotosNominais.toLocaleString('pt-BR')} votos nominais
                  </p>
                )}
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-fg-tertiary text-xs">
        Candidaturas declaradas ao TSE. Vínculo por CPF exato — dado
        autodeclarado pelo candidato.
      </p>
    </div>
  )
}
