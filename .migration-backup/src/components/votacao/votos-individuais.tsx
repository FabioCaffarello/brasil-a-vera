import Link from 'next/link'

import { getTipoVotoStyle } from '@/lib/format'
import type { VotoIndividual } from '@/lib/queries/votacoes'

interface Props {
  votos: VotoIndividual[]
  filtroAtual?: string
  totalSemFiltro?: number
  votacaoId: string
}

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'SIM', label: 'SIM' },
  { value: 'NAO', label: 'NÃO' },
  { value: 'ABSTENCAO', label: 'Abstenção' },
  { value: 'AUSENTE', label: 'Ausente' },
  { value: 'OBSTRUCAO', label: 'Obstrução' },
]

export function VotosIndividuais({
  votos,
  filtroAtual,
  totalSemFiltro,
  votacaoId,
}: Props) {
  return (
    <div>
      <nav
        aria-label="Filtrar por voto"
        className="mb-3 flex flex-wrap gap-1.5 text-xs"
      >
        {TIPOS.map((t) => {
          const isAtivo = (filtroAtual ?? '') === t.value
          const href = t.value
            ? `/votacoes/${votacaoId}?voto=${t.value}`
            : `/votacoes/${votacaoId}`
          return (
            <Link
              key={t.value}
              href={href}
              className={
                isAtivo
                  ? 'rounded bg-zinc-900 px-2.5 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'rounded border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }
            >
              {t.label}
            </Link>
          )
        })}
      </nav>

      {votos.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {filtroAtual
            ? 'Nenhum voto deste tipo registrado nesta votação.'
            : 'Sem votos individuais.'}
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            {votos.length}
            {totalSemFiltro != null && filtroAtual && ` de ${totalSemFiltro}`}{' '}
            voto{votos.length === 1 ? '' : 's'}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {votos.map((v) => {
              const style = getTipoVotoStyle(v.voto)
              return (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <Link
                    href={`/parlamentares/${v.parlamentarId}`}
                    className="min-w-0 flex-1 truncate text-zinc-800 underline decoration-dotted underline-offset-2 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400"
                  >
                    {v.parlamentarNome}
                  </Link>
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {v.parlamentarPartidoSigla}/{v.parlamentarUf}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${style.classes}`}
                  >
                    {style.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
