import type { AlinhamentoMedioBancada } from '@/lib/queries/partidos'

interface Props {
  alinhamento: AlinhamentoMedioBancada
  sigla: string
}

export function AlinhamentoMedioBancadaBlock({ alinhamento, sigla }: Props) {
  if (alinhamento.percentualMedio === null) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem dados suficientes para calcular o alinhamento médio de {sigla}.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="font-bold text-3xl text-fg-primary tabular-nums">
          {alinhamento.percentualMedio.toFixed(1)}%
        </span>
        <span className="text-fg-secondary text-sm">de alinhamento médio</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${Math.min(alinhamento.percentualMedio, 100)}%` }}
          aria-hidden
        />
      </div>

      <p className="text-fg-tertiary text-xs">
        Média do alinhamento individual dos {alinhamento.comDados} membros com
        ao menos 10 votações analisadas. Mede com que frequência cada
        parlamentar vota na mesma direção que a maioria do seu partido ou bloco.
        Alta disciplina não implica acerto ou erro de mérito.
      </p>
    </div>
  )
}
