// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

interface Props {
  totais: {
    sim: number
    nao: number
    abstencoes: number
    ausentes: number | null
  }
}

const STAT_LINE = 'flex items-baseline justify-between gap-4'

export function VotosResumo({ totais }: Props) {
  const totalNominal = totais.sim + totais.nao + totais.abstencoes
  if (totalNominal === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
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
        <dt className="font-medium text-fg-success">SIM</dt>
        <dd className="tabular-nums text-fg-primary">
          {totais.sim} ({pctSim}%)
        </dd>
      </div>
      <div className={STAT_LINE}>
        <dt className="font-medium text-fg-error">NÃO</dt>
        <dd className="tabular-nums text-fg-primary">
          {totais.nao} ({pctNao}%)
        </dd>
      </div>
      <div className={STAT_LINE}>
        <dt className="font-medium text-fg-warning">Abstenção</dt>
        <dd className="tabular-nums text-fg-primary">{totais.abstencoes}</dd>
      </div>
      {totais.ausentes != null && totais.ausentes > 0 && (
        <div className={STAT_LINE}>
          <dt className="font-medium text-fg-primary">Ausentes</dt>
          <dd className="tabular-nums text-fg-tertiary">{totais.ausentes}</dd>
        </div>
      )}
      <div
        className={`${STAT_LINE} border-line-default border-t pt-2 text-fg-tertiary`}
      >
        <dt>Total computado</dt>
        <dd className="tabular-nums">{totalNominal}</dd>
      </div>
    </dl>
  )
}
