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
  /** Série mensal vs mediana da casa (Wave 7 Sprint 7.4 PR2). */
  mensal?: GastoMensalPoint[]
  /** Top N fornecedores no ano (Wave 7 Sprint 7.4 PR3). */
  topFornecedores?: FornecedorTop[]
  /** ID do parlamentar — usado pelo link de drill-down. */
  parlamentarId?: string
}

// Sprint 4.3 PR 2 commit 4/4 — refatorado para tokens semânticos.
// Wave 7 Sprint 7.4 PR1 — Recharts adotado via ADR-025 (lib vencedora
// pós-spike). Carregada via dynamic import em gastos-chart-client.tsx;
// chunk só baixa quando a seção de gastos entra no viewport.
// D5 da Sprint 4.3 (Recharts não adotado) revertido com evidência
// empírica do spike `spike/chart-lib-benchmark` (tag spike-chart-lib-v1).
export function GastosResumoBlock({
  ano,
  resumo,
  mensal = [],
  topFornecedores = [],
  parlamentarId,
}: Props) {
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

      <GastosChart categorias={resumo.porCategoria} mensal={mensal} />

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

      {topFornecedores.length > 0 ? (
        <div className="border-border border-t pt-3">
          <h3 className="mb-2 text-foreground-muted text-xs uppercase tracking-wider">
            Top {topFornecedores.length} fornecedores
          </h3>
          <ul className="space-y-1.5 text-sm">
            {topFornecedores.map((f) => (
              <li
                className="flex items-baseline justify-between gap-3"
                key={f.cnpj || f.nome}
              >
                <span className="min-w-0 truncate text-foreground">
                  {f.nome}
                </span>
                <span className="shrink-0 tabular-nums text-foreground-muted">
                  {formatBRL(f.total)}
                  <span className="ml-1 text-foreground-muted text-xs">
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
          className="inline-flex items-center gap-1.5 text-accent text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={`/parlamentares/${parlamentarId}/gastos`}
        >
          Ver detalhe completo
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  )
}
