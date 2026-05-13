import type { ConcordanciaPar } from '@/modules/parlamentares/domain/concordancia'
import { CONCORDANCIA_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/concordancia'

interface Props {
  pares: ConcordanciaPar[]
  nomesPorId: Map<string, string>
}

export function ConcordanciaMatrix({ pares, nomesPorId }: Props) {
  if (pares.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem pares para comparar.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {pares.map((par) => {
        const nomeA = nomesPorId.get(par.parlamentarA) ?? par.parlamentarA
        const nomeB = nomesPorId.get(par.parlamentarB) ?? par.parlamentarB
        const insuficiente = par.percentual === null

        const colorClass = insuficiente
          ? 'text-zinc-500 dark:text-zinc-400'
          : (par.percentual ?? 0) >= 80
            ? 'text-emerald-700 dark:text-emerald-400'
            : (par.percentual ?? 0) >= 50
              ? 'text-zinc-700 dark:text-zinc-300'
              : 'text-amber-700 dark:text-amber-400'

        return (
          <li
            key={`${par.parlamentarA}-${par.parlamentarB}`}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
          >
            <span className="text-sm text-zinc-800 dark:text-zinc-200">
              {nomeA} <span className="text-zinc-400">×</span> {nomeB}
            </span>
            <span className="text-right">
              {insuficiente ? (
                <span className={`text-sm ${colorClass}`}>
                  Amostra &lt; {CONCORDANCIA_AMOSTRA_MINIMA} votações em comum
                </span>
              ) : (
                <>
                  <span
                    className={`font-semibold tabular-nums text-lg ${colorClass}`}
                  >
                    {par.percentual}%
                  </span>{' '}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({par.coincidentes}/{par.total} votos comuns)
                  </span>
                </>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
