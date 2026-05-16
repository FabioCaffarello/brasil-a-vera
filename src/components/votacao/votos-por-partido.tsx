import type { ResumoPorPartido } from '@/lib/queries/votacoes'

interface Props {
  porPartido: ResumoPorPartido[]
}

// Sprint 4.2 PR 5 commit 6/8 — refatorado para tokens semânticos.
// Cabeçalho da tabela e células usam mesma paleta dos badges
// individuais (TIPO_VOTO_LABELS): success/destructive/warning/brand.
export function VotosPorPartido({ porPartido }: Props) {
  if (porPartido.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Sem votos individuais para agregar por partido.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-border border-b text-foreground-muted text-xs uppercase tracking-wide">
            <th className="px-2 py-2 text-left font-medium">Partido</th>
            <th className="px-2 py-2 text-right font-medium text-success">
              SIM
            </th>
            <th className="px-2 py-2 text-right font-medium text-destructive">
              NÃO
            </th>
            <th className="px-2 py-2 text-right font-medium text-warning">
              Abst
            </th>
            <th className="px-2 py-2 text-right font-medium text-foreground-muted">
              Aus
            </th>
            <th className="px-2 py-2 text-right font-medium text-brand">Obs</th>
          </tr>
        </thead>
        <tbody>
          {porPartido.map((p) => (
            <tr
              className="border-border border-b last:border-0"
              key={p.partidoSigla}
            >
              <td className="px-2 py-1.5 font-medium text-foreground">
                {p.partidoSigla}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                {p.sim || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                {p.nao || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                {p.abstencao || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-foreground-muted">
                {p.ausente || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                {p.obstrucao || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
