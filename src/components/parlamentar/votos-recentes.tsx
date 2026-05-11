import { formatDataBR, getTipoVotoStyle } from '@/lib/format'

interface Voto {
  voto: string
  votacaoId: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
}

interface Props {
  votos: Voto[]
}

export function VotosRecentes({ votos }: Props) {
  if (votos.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem votos nominais registrados no período coberto pela base.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {votos.map((v) => {
        const style = getTipoVotoStyle(v.voto)
        return (
          <li
            key={v.votacaoId}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{formatDataBR(v.dataHora)}</span>
              <span aria-hidden>·</span>
              <span>{v.orgao}</span>
              <span aria-hidden>·</span>
              <span>
                Resultado:{' '}
                <span className="font-medium">
                  {v.aprovada ? 'aprovada' : 'rejeitada'}
                </span>
              </span>
            </div>
            <div className="mt-1.5 flex items-start gap-3">
              <span
                className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-semibold ${style.classes}`}
              >
                {style.label}
              </span>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {v.descricao}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
