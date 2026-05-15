import { BarChart3 } from 'lucide-react'

import { TrustBadge } from '@/components/trust/trust-badge'
import { formatNumeroAbreviado } from '@/lib/format-number'
import type { PublicStats } from '@/lib/queries/stats-public'

interface Props {
  stats: PublicStats
}

function formatUltimaAtualizacao(iso: string | null): string {
  if (!iso) return 'sem registro'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'sem registro'
  // Formato DD/MM HH:MM em PT-BR — relativo "há N horas" seria mais
  // amigável mas exige re-render no cliente (timezone do servidor não é
  // garantido). Absoluto evita inconsistência.
  const dia = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  const hora = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  return `${dia} ${hora}`
}

// Card 3 da home — Sprint 3.1 Tarefa 2. Estatísticas em vivo + trust badge L1
// (dados brutos agregados, sem interpretação).
export function CardStats({ stats }: Props) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
        <BarChart3 aria-hidden className="size-5" />
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
          A plataforma em números
        </h3>
        <TrustBadge trustLevel="L1" />
      </div>

      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-4">
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">
            parlamentares
          </dt>
          <dd className="font-semibold text-2xl text-zinc-900 tabular-nums dark:text-zinc-100">
            {formatNumeroAbreviado(stats.totalParlamentares)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">votações</dt>
          <dd className="font-semibold text-2xl text-zinc-900 tabular-nums dark:text-zinc-100">
            {formatNumeroAbreviado(stats.totalVotacoes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">
            proposições
          </dt>
          <dd className="font-semibold text-2xl text-zinc-900 tabular-nums dark:text-zinc-100">
            {formatNumeroAbreviado(stats.totalProposicoes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">
            última atualização
          </dt>
          <dd className="font-semibold text-base text-zinc-900 tabular-nums dark:text-zinc-100">
            {formatUltimaAtualizacao(stats.ultimaAtualizacaoVotacoes)}
          </dd>
        </div>
      </dl>
    </article>
  )
}
