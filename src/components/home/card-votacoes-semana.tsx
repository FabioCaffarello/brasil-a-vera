import { Vote } from 'lucide-react'
import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type { VotacaoRecente } from '@/lib/queries/votacoes'

interface Props {
  votacoes: VotacaoRecente[]
  /** Janela temporal usada para encontrar essas votações (7 ou 30 dias). */
  diasJanela: number
}

function truncar(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trim()}…`
}

// Card 2 da home — Sprint 3.1 Tarefa 2. Lista 3-5 votações recentes
// com fallback para janela maior se nada na semana.
export function CardVotacoesSemana({ votacoes, diasJanela }: Props) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
        <Vote aria-hidden className="size-5" />
      </div>
      <h3 className="mb-3 font-semibold text-lg text-zinc-900 dark:text-zinc-100">
        Votações da semana
      </h3>

      {votacoes.length === 0 ? (
        <p className="mb-4 flex-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Nenhuma votação registrada nos últimos {diasJanela} dias. Atualize em
          alguns dias — o cron ingere 4×/dia.
        </p>
      ) : (
        <ol className="mb-3 flex-1 space-y-3 text-sm">
          {votacoes.map((v) => (
            <li
              key={v.id}
              className="border-zinc-200 border-b pb-2 last:border-0 dark:border-zinc-700"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="tabular-nums">{formatDataBR(v.dataHora)}</span>
                <span aria-hidden>·</span>
                <span className="font-medium uppercase tracking-wide">
                  {v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
                </span>
                <span aria-hidden>·</span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[10px] uppercase ${
                    v.aprovada
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                  }`}
                >
                  {v.aprovada ? 'Aprovada' : 'Rejeitada'}
                </span>
              </div>
              <Link
                href={`/votacoes/${v.id}`}
                className="line-clamp-2 text-zinc-800 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-zinc-200 dark:hover:text-primary-300"
              >
                {truncar(v.descricao, 100)}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {votacoes.length > 0 && (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          {votacoes.length}{' '}
          {votacoes.length === 1
            ? 'votação nos últimos'
            : 'votações nos últimos'}{' '}
          {diasJanela} dias. Atualizado conforme novos votos são ingeridos.
        </p>
      )}

      <Link
        href="/votacoes"
        className="inline-flex items-center font-medium text-primary-700 text-sm hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-300 dark:hover:text-primary-100"
      >
        Ver todas <span aria-hidden>→</span>
      </Link>
    </article>
  )
}
