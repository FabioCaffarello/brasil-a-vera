import { formatBRL } from '@/lib/format'
import type { GastosResumo } from '@/lib/queries/parlamentares'

interface Props {
  ano: number
  resumo: GastosResumo
}

// Sprint 4.3 PR 2 commit 4/4 — refatorado para tokens semânticos.
// D5 (Sprint 4.3): Recharts NÃO adotado — ADR-019 (sem dep nova sem
// evidência de gargalo). Tabela atual com top 3 + agregado já é clara
// para a finalidade.
export function GastosResumoBlock({ ano, resumo }: Props) {
  if (resumo.totalRegistros === 0) {
    return (
      <p className="text-foreground-muted text-sm">
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
        <span className="font-semibold text-2xl text-foreground">
          {formatBRL(resumo.totalGeral)}
        </span>
        <span className="text-foreground-muted text-sm">
          em {resumo.totalRegistros} gasto
          {resumo.totalRegistros === 1 ? '' : 's'} · ano {ano}
        </span>
      </div>

      <ul className="space-y-1.5 text-sm">
        {top.map((c) => (
          <li
            className="flex items-baseline justify-between gap-3"
            key={c.categoriaDescricao}
          >
            <span className="min-w-0 truncate text-foreground">
              {c.categoriaDescricao}
            </span>
            <span className="shrink-0 tabular-nums text-foreground-muted">
              {formatBRL(c.total)}
              <span className="ml-1 text-foreground-muted text-xs">
                ({c.n})
              </span>
            </span>
          </li>
        ))}
        {restoCategorias.length > 0 && (
          <li className="flex items-baseline justify-between gap-3 border-border border-t pt-1.5 text-foreground-muted">
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
