import { TrustBadge } from '@/components/trust/trust-badge'
import { formatDataHoraBR } from '@/lib/format'

interface Props {
  votacao: {
    casa: string
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    sourceUrl: string
    trustLevel: 'L1' | 'L2' | 'L3' | 'L4'
  }
}

export function PerfilVotacaoHeader({ votacao: v }: Props) {
  return (
    <header className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{formatDataHoraBR(v.dataHora)}</span>
        <span aria-hidden>·</span>
        <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
        <span aria-hidden>·</span>
        <span>{v.orgao}</span>
        <span aria-hidden>·</span>
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

      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {v.descricao}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <TrustBadge trustLevel={v.trustLevel} />
        <a
          href={v.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Ver na fonte oficial ↗
        </a>
      </div>
    </header>
  )
}
