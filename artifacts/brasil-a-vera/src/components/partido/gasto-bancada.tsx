import { formatBRL } from '@/lib/format'
import type { GastoBancada } from '@/lib/queries/partidos'

interface Props {
  ano: number
  gasto: GastoBancada
}

export function GastoBancadaBlock({ ano, gasto }: Props) {
  if (gasto.totalRegistros === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Nenhum gasto CEAP da bancada registrado em {ano}. Senado tem regime
        próprio (auxílio-moradia + verbas de gabinete) ainda não ingerido —
        cobertura completa virá em wave futura.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-2xl tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatBRL(gasto.totalGeral)}
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          em {ano}
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Soma da Cota para Exercício da Atividade Parlamentar (CEAP) dos membros
        atuais da bancada, em {gasto.totalRegistros}{' '}
        {gasto.totalRegistros === 1 ? 'lançamento' : 'lançamentos'}.
      </p>
    </div>
  )
}
