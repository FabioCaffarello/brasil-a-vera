import type { FidelidadeInternaMedia } from '@/lib/queries/partidos'

interface Props {
  fidelidade: FidelidadeInternaMedia
}

// Sprint 4.4 PR 1 commit 3/6 — refatorado para tokens semânticos.
// Mesmo padrão de 3 limiares de cor do `AlinhamentoBancada` (Sprint
// 4.3 PR 2 commit 2/4): success / foreground / warning.
export function FidelidadeMediaBlock({ fidelidade }: Props) {
  const { percentualMedio, parlamentaresElegiveis, parlamentaresTotal } =
    fidelidade

  if (percentualMedio === null) {
    return (
      <div className="space-y-2">
        <p className="text-foreground-muted text-sm">
          {parlamentaresTotal === 0
            ? 'Sem orientações partidárias registradas para as votações desta bancada até o momento. A cobertura cresce a cada execução do cron de ingestão (4×/dia). Senado não publica orientações em endpoint público (#83) — fidelidade só é calculável para parlamentares da Câmara.'
            : `Nenhum membro tem 50+ votos comparáveis (orientação não-LIBERADO + voto não-AUSENTE). ${parlamentaresTotal} ${parlamentaresTotal === 1 ? 'membro tem' : 'membros têm'} algum dado, mas amostra é insuficiente.`}
        </p>
      </div>
    )
  }

  const colorClass =
    percentualMedio >= 80
      ? 'text-success'
      : percentualMedio >= 50
        ? 'text-foreground'
        : 'text-warning'

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold text-3xl tabular-nums ${colorClass}`}>
          {percentualMedio}%
        </span>
        <span className="text-foreground-muted text-sm">
          fidelidade interna média
        </span>
      </div>
      <p className="text-foreground-muted text-xs">
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
