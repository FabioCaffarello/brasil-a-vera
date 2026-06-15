// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import type { ResumoPorPartido } from '@/lib/queries/votacoes'

interface Props {
  porPartido: ResumoPorPartido[]
}

export function VotosPorPartido({ porPartido }: Props) {
  if (porPartido.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem votos individuais para agregar por partido.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-line-default border-b text-fg-tertiary text-xs uppercase tracking-wide">
            <th className="px-2 py-2 text-left font-medium">Partido</th>
            <th className="px-2 py-2 text-right font-medium text-fg-success">
              SIM
            </th>
            <th className="px-2 py-2 text-right font-medium text-fg-error">
              NÃO
            </th>
            <th className="px-2 py-2 text-right font-medium text-fg-warning">
              Abst
            </th>
            <th className="px-2 py-2 text-right font-medium text-fg-tertiary">
              Aus
            </th>
            <th className="px-2 py-2 text-right font-medium text-fg-brand">
              Obs
            </th>
          </tr>
        </thead>
        <tbody>
          {porPartido.map((p) => (
            <tr
              className="border-line-default border-b last:border-0"
              key={p.partidoSigla}
            >
              <td className="px-2 py-1.5 font-medium text-fg-primary">
                {p.partidoSigla}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-fg-primary">
                {p.sim || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-fg-primary">
                {p.nao || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-fg-primary">
                {p.abstencao || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-fg-tertiary">
                {p.ausente || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-fg-primary">
                {p.obstrucao || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
