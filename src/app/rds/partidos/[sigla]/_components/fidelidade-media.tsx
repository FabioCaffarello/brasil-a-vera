// Cópia-rds de src/components/partido/fidelidade-media.tsx.
// Server Component puro. Lógica de limiares EXATA preservada
// (success ≥80% / foreground ≥50% / warning <50% — mesmo padrão do
// AlinhamentoBancada). Só os tokens são traduzidos.

import { Text } from '@fabio.caffarello/react-design-system/server'

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
        <Text variant="bodySmall" className="text-fg-tertiary">
          {parlamentaresTotal === 0
            ? 'Sem orientações partidárias registradas para as votações desta bancada até o momento. A cobertura cresce a cada execução do cron de ingestão (4×/dia). Senado não publica orientações em endpoint público (#83) — fidelidade só é calculável para parlamentares da Câmara.'
            : `Nenhum membro tem 50+ votos comparáveis (orientação não-LIBERADO + voto não-AUSENTE). ${parlamentaresTotal} ${parlamentaresTotal === 1 ? 'membro tem' : 'membros têm'} algum dado, mas amostra é insuficiente.`}
        </Text>
      </div>
    )
  }

  const colorClass =
    percentualMedio >= 80
      ? 'text-fg-success'
      : percentualMedio >= 50
        ? 'text-fg-primary'
        : 'text-fg-warning'

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold text-3xl tabular-nums ${colorClass}`}>
          {percentualMedio}%
        </span>
        <Text variant="bodySmall" className="text-fg-tertiary">
          fidelidade interna média
        </Text>
      </div>
      <p className="text-fg-tertiary text-xs">
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
