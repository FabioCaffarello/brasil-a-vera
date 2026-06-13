// src/components/partido/gasto-bancada.tsx — consome o RDS (tokens
// traduzidos via docs/migration/token-map.md; promovido do staging /rds/).
// Server Component puro — total CEAP + descrição.

import { Text } from '@fabio.caffarello/react-design-system/server'

import { formatBRL } from '@/lib/format'
import type { GastoBancada } from '@/lib/queries/partidos'

interface Props {
  ano: number
  gasto: GastoBancada
}

export function GastoBancadaBlock({ ano, gasto }: Props) {
  if (gasto.totalRegistros === 0) {
    return (
      <Text variant="bodySmall" className="text-fg-tertiary">
        Nenhum gasto CEAP da bancada registrado em {ano}. Senado tem regime
        próprio (auxílio-moradia + verbas de gabinete) ainda não ingerido —
        cobertura completa virá em wave futura.
      </Text>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold tabular-nums text-2xl text-fg-primary">
          {formatBRL(gasto.totalGeral)}
        </span>
        <Text variant="bodySmall" className="text-fg-tertiary">
          em {ano}
        </Text>
      </div>
      <p className="text-fg-tertiary text-xs">
        Soma da Cota para Exercício da Atividade Parlamentar (CEAP) dos membros
        atuais da bancada, em {gasto.totalRegistros}{' '}
        {gasto.totalRegistros === 1 ? 'lançamento' : 'lançamentos'}.
      </p>
    </div>
  )
}
