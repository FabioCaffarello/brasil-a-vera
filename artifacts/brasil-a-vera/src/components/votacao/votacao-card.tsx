import { Link } from 'wouter'

import { formatDataBR } from '@/lib/format'

interface Props {
  votacao: {
    id: string
    casa: string
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    votosSim: number
    votosNao: number
    abstencoes: number
  }
}

export function VotacaoCard({ votacao: v }: Props) {
  const totalNominais = v.votosSim + v.votosNao + v.abstencoes
  return (
    <Link
      href={`/votacoes/${v.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <span>{formatDataBR(v.dataHora)}</span>
          <span aria-hidden>·</span>
          <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
          <span aria-hidden>·</span>
          <span>{v.orgao}</span>
        </span>
        <span
          className={
            v.aprovada
              ? 'rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
              : 'rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
          }
        >
          {v.aprovada ? 'Aprovada' : 'Rejeitada'}
        </span>
      </div>
      <p className="line-clamp-3 text-sm text-zinc-800 dark:text-zinc-200">
        {v.descricao}
      </p>
      {totalNominais > 0 && (
        <p className="mt-2 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
          Sim: {v.votosSim} · Não: {v.votosNao} · Abstenção: {v.abstencoes}
        </p>
      )}
    </Link>
  )
}
