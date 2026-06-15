import type { ConcordanciaPar } from '@/modules/parlamentares/domain/concordancia'
import { CONCORDANCIA_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/concordancia'

interface Props {
  pares: ConcordanciaPar[]
  nomesPorId: Map<string, string>
}

// Sprint 4.4 PR 2 commit 2/3 — refatorado para tokens semânticos.
// Mesmo padrão de 3 limiares de cor de `AlinhamentoBancada` (Sprint
// 4.3 PR 2) e `FidelidadeMediaBlock` (Sprint 4.4 PR 1): success /
// foreground / warning. Coerência cross-rota na leitura de %.
export function ConcordanciaMatrix({ pares, nomesPorId }: Props) {
  if (pares.length === 0) {
    return <p className="text-fg-tertiary text-sm">Sem pares para comparar.</p>
  }

  return (
    <ul className="space-y-2">
      {pares.map((par) => {
        const nomeA = nomesPorId.get(par.parlamentarA) ?? par.parlamentarA
        const nomeB = nomesPorId.get(par.parlamentarB) ?? par.parlamentarB
        const insuficiente = par.percentual === null

        const colorClass = insuficiente
          ? 'text-fg-tertiary'
          : (par.percentual ?? 0) >= 80
            ? 'text-fg-success'
            : (par.percentual ?? 0) >= 50
              ? 'text-fg-primary'
              : 'text-fg-warning'

        return (
          <li
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-line-default p-3"
            key={`${par.parlamentarA}-${par.parlamentarB}`}
          >
            <span className="text-fg-primary text-sm">
              {nomeA} <span className="text-fg-quaternary">×</span> {nomeB}
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
                  <span className="text-fg-tertiary text-xs">
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
