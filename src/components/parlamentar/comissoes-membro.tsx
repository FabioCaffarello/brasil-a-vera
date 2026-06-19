import { Landmark } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { DataBadge } from '@/design-system/compositions/data-badge'
import type { ComissoesView } from '@/modules/parlamentares/domain/comissoes-view'

// 'YYYY-MM-DD' -> 'MM/YYYY' sem parse de Date (evita deslize de timezone).
function formatMesAno(data: string): string {
  return `${data.slice(5, 7)}/${data.slice(0, 4)}`
}

// Seção "Comissões" do perfil. Estática (server component, sem JS). Ativas em
// detalhe (cargo de liderança destacado); histórico encerrado no mandato de
// forma compacta (contagem + siglas). Copy temporal sempre "atualmente" — nunca
// afirma "nunca serviu" (a tabela só cobre a legislatura corrente).
export function ComissoesMembro({
  ativas,
  historicasSiglas,
  totalHistoricas,
}: ComissoesView) {
  let principal: React.ReactNode
  if (ativas.length > 0) {
    principal = (
      <ul className="space-y-3">
        {ativas.map((c) => (
          <li
            className="rounded-lg border border-line-default p-3"
            key={`${c.sigla ?? c.nome}-${c.dataInicio}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {c.sigla ? (
                <span className="font-medium font-mono text-fg-primary text-sm">
                  {c.sigla}
                </span>
              ) : null}
              <DataBadge
                label={c.cargo}
                tone={c.lideranca ? 'accent' : 'default'}
              />
              <span className="text-fg-tertiary text-xs">
                desde {formatMesAno(c.dataInicio)}
              </span>
            </div>
            <p className="mt-1.5 text-fg-primary text-sm">{c.nome}</p>
          </li>
        ))}
      </ul>
    )
  } else if (totalHistoricas === 0) {
    principal = (
      <EmptyState
        icon={Landmark}
        title="Sem registro de comissão nesta legislatura."
      />
    )
  } else {
    principal = (
      <p className="text-fg-tertiary text-sm">Não ocupa comissão no momento.</p>
    )
  }

  return (
    <div className="space-y-4">
      {principal}

      {totalHistoricas > 0 ? (
        <div className="border-line-default border-t pt-3">
          <p className="text-fg-tertiary text-sm">
            Nesta legislatura também participou de{' '}
            <span className="font-medium text-fg-primary">
              {totalHistoricas}
            </span>{' '}
            {totalHistoricas === 1 ? 'comissão' : 'comissões'}:
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {historicasSiglas.map((sigla) => (
              <li key={sigla}>
                <DataBadge label={sigla} tone="default" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
