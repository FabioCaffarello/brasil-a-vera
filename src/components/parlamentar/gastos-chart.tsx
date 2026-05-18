'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { GastoCategoria } from '@/lib/queries/parlamentares'

interface Props {
  /** Categorias já agregadas (do getGastosResumo). */
  categorias: GastoCategoria[]
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const brlShort = (n: number) =>
  n >= 1_000_000
    ? `R$ ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `R$ ${Math.round(n / 1_000)}k`
      : `R$ ${n}`

/**
 * Gráfico de gastos por categoria (Wave 7 Sprint 7.4 PR1 — setup
 * Recharts via dynamic import).
 *
 * Este componente é Client Component dynamic-imported em
 * `gastos-resumo.tsx` — o chunk de Recharts (~83 kB gzip per ADR-025)
 * só baixa quando o usuário visita `/parlamentares/[id]` E rola até
 * a seção de gastos. Path anônimo (home, listagem, busca) zero JS
 * de chart preservado.
 *
 * PR1 entrega bar horizontal mínima (substitui a tabela top-3 atual
 * em `gastos-resumo.tsx`). PR2 da Sprint 7.4 adiciona:
 * - Linha mensal vs mediana da casa
 * - Filtros de período/categoria
 * - Tooltip rico com % do total
 */
export function GastosChart({ categorias }: Props) {
  // Top 8 categorias (já vêm ordenadas por valor DESC do getGastosResumo).
  const data = categorias.slice(0, 8).map((c) => ({
    categoria: c.categoriaDescricao,
    valor: Number(c.total),
  }))

  if (data.length === 0) return null

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
        >
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            tick={{ fill: 'hsl(var(--foreground-muted))', fontSize: 11 }}
            tickFormatter={brlShort}
            type="number"
          />
          <YAxis
            dataKey="categoria"
            tick={{ fill: 'hsl(var(--foreground-muted))', fontSize: 11 }}
            type="category"
            width={140}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--surface-elevated))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value) => brl.format(Number(value))}
          />
          <Bar
            dataKey="valor"
            fill="hsl(var(--chart-1))"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
