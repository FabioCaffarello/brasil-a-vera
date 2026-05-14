import { formatBRL } from '@/lib/format'
import type { GastosResumo } from '@/lib/queries/parlamentares'

interface Props {
  ano: number
  resumo: GastosResumo
}

export function GastosResumoBlock({ ano, resumo }: Props) {
  if (resumo.totalRegistros === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem gastos CEAP registrados em {ano} para este parlamentar.
      </p>
    )
  }

  // Top 3 categorias + agregação do resto
  const top = resumo.porCategoria.slice(0, 3)
  const restoCategorias = resumo.porCategoria.slice(3)
  const restoTotal = restoCategorias.reduce(
    (acc, c) => acc + Number(c.total),
    0,
  )
  const restoN = restoCategorias.reduce((acc, c) => acc + c.n, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {formatBRL(resumo.totalGeral)}
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          em {resumo.totalRegistros} gasto
          {resumo.totalRegistros === 1 ? '' : 's'} · ano {ano}
        </span>
      </div>

      <ul className="space-y-1.5 text-sm">
        {top.map((c) => (
          <li
            key={c.categoriaDescricao}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
              {c.categoriaDescricao}
            </span>
            <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
              {formatBRL(c.total)}
              <span className="ml-1 text-xs text-zinc-500">({c.n})</span>
            </span>
          </li>
        ))}
        {restoCategorias.length > 0 && (
          <li className="flex items-baseline justify-between gap-3 border-t border-zinc-200 pt-1.5 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <span>
              + {restoCategorias.length} outras categoria
              {restoCategorias.length === 1 ? '' : 's'}
            </span>
            <span className="tabular-nums">
              {formatBRL(restoTotal)}
              <span className="ml-1 text-xs">({restoN})</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}
