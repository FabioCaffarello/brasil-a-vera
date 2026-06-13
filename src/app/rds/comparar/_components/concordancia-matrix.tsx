// Cópia-rds de src/components/comparar/concordancia-matrix.tsx — onda
// HeroSection (rota /comparar). Original INTOCADO (strangler fig).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   text-foreground-muted   → text-fg-tertiary
//   text-foreground         → text-fg-primary
//   text-foreground-subtle  → text-fg-quaternary
//   text-success            → text-fg-success
//   text-warning            → text-fg-warning
//   border-border           → border-line-default
//
// Padrão "3 limiares de cor semânticos" (≥80 success / ≥50 foreground /
// <50 warning) — MESMO de AlinhamentoBancada/FidelidadeMediaBlock já
// traduzido nas pilotos. NÃO é data-viz (sem SVG/chart/hsl(var())/
// color-mix); é um <ul> com classes de cor de status, todas no mapa.
// Tradução 1:1 da lógica de limiares preservada exata.

import type { ConcordanciaPar } from '@/modules/parlamentares/domain/concordancia'
import { CONCORDANCIA_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/concordancia'

interface Props {
  pares: ConcordanciaPar[]
  nomesPorId: Map<string, string>
}

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
