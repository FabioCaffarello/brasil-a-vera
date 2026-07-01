import { Card } from '@fabio.caffarello/react-design-system/server'
import { Briefcase } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import type { MandatoExterno } from '@/lib/queries/mandatos-externos'

interface Props {
  mandatos: MandatoExterno[]
}

function formatPeriodo(
  anoInicio: number | null,
  anoFim: number | null,
): string {
  if (!anoInicio && !anoFim) return ''
  if (anoInicio && anoFim) return `${anoInicio}–${anoFim}`
  if (anoInicio) return `desde ${anoInicio}`
  return `até ${anoFim}`
}

function formatLocalidade(
  siglaUf: string | null,
  municipio: string | null,
): string {
  if (municipio && siglaUf) return `${municipio}/${siglaUf}`
  if (municipio) return municipio
  if (siglaUf) return siglaUf
  return ''
}

export function MandatosExternos({ mandatos }: Props) {
  if (mandatos.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Nenhum mandato externo registrado"
        description="A Câmara dos Deputados não registra mandatos eletivos anteriores para este deputado."
      />
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {mandatos.map((m) => {
          const periodo = formatPeriodo(m.anoInicio, m.anoFim)
          const localidade = formatLocalidade(m.siglaUf, m.municipio)
          const key = `${m.cargo}-${m.anoInicio ?? 'x'}-${m.siglaUf ?? 'x'}`

          return (
            <li key={key}>
              <Card padding="none" className="p-3" variant="default">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-fg-primary text-sm">
                    {m.cargo}
                  </span>
                  {localidade && (
                    <span className="text-fg-secondary text-sm">
                      {localidade}
                    </span>
                  )}
                  {periodo && (
                    <span className="ml-auto text-fg-tertiary text-xs tabular-nums">
                      {periodo}
                    </span>
                  )}
                </div>
                {m.siglaPartidoEleicao && (
                  <p className="mt-0.5 text-fg-tertiary text-xs">
                    Eleito pelo {m.siglaPartidoEleicao}
                  </p>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
      <p className="text-fg-tertiary text-xs">
        Mandatos eletivos anteriores ao atual verificados pelo TSE. Dados
        autodeclarados pelo candidato e confirmados na prestação de contas
        eleitoral.
      </p>
    </div>
  )
}
