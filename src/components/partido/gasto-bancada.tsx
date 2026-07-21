// src/components/partido/gasto-bancada.tsx — consome o RDS (tokens
// traduzidos via docs/migration/token-map.md; promovido do staging /rds/).
// Server Component puro — total CEAP + top 5 categorias.

import { Text } from '@fabio.caffarello/react-design-system/server'

import { formatBRL } from '@/lib/format'
import type {
  GastoBancada,
  GastoCategoriasBancada,
} from '@/lib/queries/partidos'

interface Props {
  ano: number
  gasto: GastoBancada
  categorias?: GastoCategoriasBancada
}

export function GastoBancadaBlock({ ano, gasto, categorias }: Props) {
  if (gasto.totalRegistros === 0) {
    return (
      <Text variant="bodySmall" className="text-fg-tertiary">
        Nenhum gasto CEAP da bancada registrado em {ano}. Senado tem regime
        próprio (auxílio-moradia + verbas de gabinete) ainda não ingerido —
        cobertura completa virá em wave futura.
      </Text>
    )
  }

  const total = Number(gasto.totalGeral)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold tabular-nums text-2xl text-fg-primary">
          {formatBRL(gasto.totalGeral)}
        </span>
        <Text variant="bodySmall" className="text-fg-tertiary">
          em {ano}
        </Text>
      </div>

      {categorias && categorias.categorias.length > 0 && (
        <ul className="space-y-1">
          {categorias.categorias.map((c) => (
            <li className="flex items-center gap-2" key={c.descricao}>
              <div className="flex-1 overflow-hidden rounded-full bg-surface-raised">
                <div
                  aria-hidden
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.round((Number(c.total) / total) * 100)}%`,
                    backgroundColor: 'var(--color-chart-1)',
                  }}
                />
              </div>
              <span className="w-36 shrink-0 truncate text-right text-fg-secondary text-xs">
                {c.descricao}
              </span>
              <span className="w-24 shrink-0 text-right tabular-nums text-fg-tertiary text-xs">
                {formatBRL(c.total)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-fg-tertiary text-xs">
        Soma da Cota para Exercício da Atividade Parlamentar (CEAP) dos membros
        atuais da bancada, em {gasto.totalRegistros}{' '}
        {gasto.totalRegistros === 1 ? 'lançamento' : 'lançamentos'}.
      </p>
    </div>
  )
}
