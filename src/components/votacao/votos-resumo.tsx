interface Props {
  totais: {
    sim: number
    nao: number
    abstencoes: number
    ausentes: number | null
  }
}

const STAT_LINE = 'flex items-baseline justify-between gap-4'

// Sprint 4.2 PR 5 commit 5/8 — refatorado para tokens semânticos.
// Cores alinhadas com TIPO_VOTO_LABELS em `format.ts` (commit 1/8):
// SIM=success, NÃO=destructive, ABSTENCAO=warning, AUSENTE=muted.
export function VotosResumo({ totais }: Props) {
  const totalNominal = totais.sim + totais.nao + totais.abstencoes
  if (totalNominal === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Votação simbólica — não houve voto individual registrado pela fonte
        oficial. É comum em comissões e em encaminhamentos procedimentais.
      </p>
    )
  }

  const pctSim = Math.round((totais.sim / totalNominal) * 100)
  const pctNao = Math.round((totais.nao / totalNominal) * 100)

  return (
    <dl className="space-y-2 text-sm">
      <div className={STAT_LINE}>
        <dt className="font-medium text-success">SIM</dt>
        <dd className="tabular-nums text-foreground">
          {totais.sim} ({pctSim}%)
        </dd>
      </div>
      <div className={STAT_LINE}>
        <dt className="font-medium text-destructive">NÃO</dt>
        <dd className="tabular-nums text-foreground">
          {totais.nao} ({pctNao}%)
        </dd>
      </div>
      <div className={STAT_LINE}>
        <dt className="font-medium text-warning">Abstenção</dt>
        <dd className="tabular-nums text-foreground">{totais.abstencoes}</dd>
      </div>
      {totais.ausentes != null && totais.ausentes > 0 && (
        <div className={STAT_LINE}>
          <dt className="font-medium text-foreground">Ausentes</dt>
          <dd className="tabular-nums text-foreground-muted">
            {totais.ausentes}
          </dd>
        </div>
      )}
      <div
        className={`${STAT_LINE} border-border border-t pt-2 text-foreground-muted`}
      >
        <dt>Total computado</dt>
        <dd className="tabular-nums">{totalNominal}</dd>
      </div>
    </dl>
  )
}
