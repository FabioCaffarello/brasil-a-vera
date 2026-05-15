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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
        <dt className="font-medium text-emerald-700 dark:text-emerald-400">
          SIM
        </dt>
        <dd className="tabular-nums text-zinc-700 dark:text-zinc-300">
          {totais.sim} ({pctSim}%)
        </dd>
      </div>
      <div className={STAT_LINE}>
        <dt className="font-medium text-rose-700 dark:text-rose-400">NÃO</dt>
        <dd className="tabular-nums text-zinc-700 dark:text-zinc-300">
          {totais.nao} ({pctNao}%)
        </dd>
      </div>
      <div className={STAT_LINE}>
        <dt className="font-medium text-amber-700 dark:text-amber-400">
          Abstenção
        </dt>
        <dd className="tabular-nums text-zinc-700 dark:text-zinc-300">
          {totais.abstencoes}
        </dd>
      </div>
      {totais.ausentes != null && totais.ausentes > 0 && (
        <div className={STAT_LINE}>
          <dt className="font-medium text-zinc-700 dark:text-zinc-300">
            Ausentes
          </dt>
          <dd className="tabular-nums text-zinc-600 dark:text-zinc-400">
            {totais.ausentes}
          </dd>
        </div>
      )}
      <div
        className={`${STAT_LINE} border-zinc-200 border-t pt-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400`}
      >
        <dt>Total computado</dt>
        <dd className="tabular-nums">{totalNominal}</dd>
      </div>
    </dl>
  )
}
