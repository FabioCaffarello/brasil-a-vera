import type { FidelidadeInternaMedia } from '@/lib/queries/partidos'

interface Props {
  fidelidade: FidelidadeInternaMedia
}

export function FidelidadeMediaBlock({ fidelidade }: Props) {
  const { percentualMedio, parlamentaresElegiveis, parlamentaresTotal } =
    fidelidade

  if (percentualMedio === null) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {parlamentaresTotal === 0
            ? 'Sem orientações partidárias registradas para as votações desta bancada até o momento. A cobertura cresce a cada execução do cron de ingestão (4×/dia). Senado não publica orientações em endpoint público (#83) — fidelidade só é calculável para parlamentares da Câmara.'
            : `Nenhum membro tem 50+ votos comparáveis (orientação não-LIBERADO + voto não-AUSENTE). ${parlamentaresTotal} ${parlamentaresTotal === 1 ? 'membro tem' : 'membros têm'} algum dado, mas amostra é insuficiente.`}
        </p>
      </div>
    )
  }

  const colorClass =
    percentualMedio >= 80
      ? 'text-emerald-700 dark:text-emerald-400'
      : percentualMedio >= 50
        ? 'text-zinc-700 dark:text-zinc-300'
        : 'text-amber-700 dark:text-amber-400'

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold text-3xl tabular-nums ${colorClass}`}>
          {percentualMedio}%
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          fidelidade interna média
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Média simples do alinhamento dos {parlamentaresElegiveis}{' '}
        {parlamentaresElegiveis === 1
          ? 'parlamentar elegível'
          : 'parlamentares elegíveis'}{' '}
        (50+ votos comparáveis cada). Membros com menos votos não entram no
        cálculo. Não pondera por número de votos — privilegia "qual membro médio
        segue a bancada", não "quantos votos cada um deu".
      </p>
    </div>
  )
}
