import { formatDataBR } from '@/lib/format'

interface Votacao {
  id: string
  casa: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
  votosSim: number
  votosNao: number
}

interface Props {
  votacoes: Votacao[]
}

export function VotacoesVinculadas({ votacoes }: Props) {
  if (votacoes.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Nenhuma votação foi vinculada a esta proposição na base atual. Isso pode
        acontecer se a votação correspondente não foi ingerida, ou se ainda não
        houve votação registrada.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {votacoes.map((v) => (
        <li
          key={v.id}
          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{formatDataBR(v.dataHora)}</span>
            <span aria-hidden>·</span>
            <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
            <span aria-hidden>·</span>
            <span>{v.orgao}</span>
            <span aria-hidden>·</span>
            <span
              className={
                v.aprovada
                  ? 'font-medium text-emerald-700 dark:text-emerald-400'
                  : 'font-medium text-rose-700 dark:text-rose-400'
              }
            >
              {v.aprovada ? 'Aprovada' : 'Rejeitada'}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">
            {v.descricao}
          </p>
          {(v.votosSim > 0 || v.votosNao > 0) && (
            <p className="mt-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
              Sim: {v.votosSim} · Não: {v.votosNao}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
