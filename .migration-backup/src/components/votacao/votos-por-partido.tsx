import type { ResumoPorPartido } from '@/lib/queries/votacoes'

interface Props {
  porPartido: ResumoPorPartido[]
}

export function VotosPorPartido({ porPartido }: Props) {
  if (porPartido.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem votos individuais para agregar por partido.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <th className="px-2 py-2 text-left font-medium">Partido</th>
            <th className="px-2 py-2 text-right font-medium text-emerald-700 dark:text-emerald-400">
              SIM
            </th>
            <th className="px-2 py-2 text-right font-medium text-rose-700 dark:text-rose-400">
              NÃO
            </th>
            <th className="px-2 py-2 text-right font-medium text-amber-700 dark:text-amber-400">
              Abst
            </th>
            <th className="px-2 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Aus
            </th>
            <th className="px-2 py-2 text-right font-medium text-violet-700 dark:text-violet-400">
              Obs
            </th>
          </tr>
        </thead>
        <tbody>
          {porPartido.map((p) => (
            <tr
              key={p.partidoSigla}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              <td className="px-2 py-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                {p.partidoSigla}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                {p.sim || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                {p.nao || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                {p.abstencao || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                {p.ausente || ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                {p.obstrucao || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
