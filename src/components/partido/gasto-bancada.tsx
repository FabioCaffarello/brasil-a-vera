import { formatBRL } from '@/lib/format'
import type { GastoBancada } from '@/lib/queries/partidos'

interface Props {
  ano: number
  gasto: GastoBancada
}

// Sprint 4.4 PR 1 commit 5/6 — refatorado para tokens semânticos.
// Total CEAP da bancada + descrição. Sem categorias (escopo
// agregado partido, não individual).
export function GastoBancadaBlock({ ano, gasto }: Props) {
  if (gasto.totalRegistros === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Nenhum gasto CEAP da bancada registrado em {ano}. Senado tem regime
        próprio (auxílio-moradia + verbas de gabinete) ainda não ingerido —
        cobertura completa virá em wave futura.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold tabular-nums text-2xl text-foreground">
          {formatBRL(gasto.totalGeral)}
        </span>
        <span className="text-foreground-muted text-sm">em {ano}</span>
      </div>
      <p className="text-foreground-muted text-xs">
        Soma da Cota para Exercício da Atividade Parlamentar (CEAP) dos membros
        atuais da bancada, em {gasto.totalRegistros}{' '}
        {gasto.totalRegistros === 1 ? 'lançamento' : 'lançamentos'}.
      </p>
    </div>
  )
}
