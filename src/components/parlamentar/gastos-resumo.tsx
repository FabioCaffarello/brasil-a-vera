// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { GastosChart } from '@/components/parlamentar/gastos-chart-client'
import { formatBRL } from '@/lib/format'
import type {
  FornecedorTop,
  GastoMensalPoint,
  GastosResumo,
} from '@/lib/queries/parlamentares'

interface Props {
  ano: number
  resumo: GastosResumo
  /** Série mensal vs mediana da casa. */
  mensal?: GastoMensalPoint[]
  /** Top N fornecedores no ano. */
  topFornecedores?: FornecedorTop[]
  /** ID do parlamentar — usado pelo link de drill-down. */
  parlamentarId?: string
}

export function GastosResumoBlock({
  ano,
  resumo,
  mensal = [],
  topFornecedores = [],
  parlamentarId,
}: Props) {
  if (resumo.totalRegistros === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
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
        <span className="font-semibold text-2xl text-fg-primary">
          {formatBRL(resumo.totalGeral)}
        </span>
        <span className="text-fg-tertiary text-sm">
          em {resumo.totalRegistros} gasto
          {resumo.totalRegistros === 1 ? '' : 's'} · ano {ano}
        </span>
      </div>

      <GastosChart categorias={resumo.porCategoria} mensal={mensal} />

      <ul className="space-y-1.5 text-sm">
        {top.map((c) => (
          <li
            className="flex items-baseline justify-between gap-3"
            key={c.categoriaDescricao}
          >
            <span className="min-w-0 truncate text-fg-primary">
              {c.categoriaDescricao}
            </span>
            <span className="shrink-0 tabular-nums text-fg-tertiary">
              {formatBRL(c.total)}
              <span className="ml-1 text-fg-tertiary text-xs">({c.n})</span>
            </span>
          </li>
        ))}
        {restoCategorias.length > 0 && (
          <li className="flex items-baseline justify-between gap-3 border-line-default border-t pt-1.5 text-fg-tertiary">
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

      {topFornecedores.length > 0 ? (
        <div className="border-line-default border-t pt-3">
          <h3 className="mb-2 text-fg-tertiary text-xs uppercase tracking-wider">
            Top {topFornecedores.length} fornecedores
          </h3>
          <ul className="space-y-1.5 text-sm">
            {topFornecedores.map((f) => (
              <li
                className="flex items-baseline justify-between gap-3"
                key={f.cnpj || f.nome}
              >
                <span className="min-w-0 truncate text-fg-primary">
                  {f.nome}
                </span>
                <span className="shrink-0 tabular-nums text-fg-tertiary">
                  {formatBRL(f.total)}
                  <span className="ml-1 text-fg-tertiary text-xs">
                    ({f.registros})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {parlamentarId ? (
        <Link
          className="inline-flex items-center gap-1.5 text-accent text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href={`/parlamentares/${parlamentarId}/gastos`}
        >
          Ver detalhe completo
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  )
}
