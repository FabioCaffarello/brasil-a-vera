'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type {
  GastoCategoria,
  GastoMensalPoint,
} from '@/lib/queries/parlamentares'

interface Props {
  /** Categorias já agregadas (do getGastosResumo). */
  categorias: GastoCategoria[]
  /** Série mensal do ano corrente vs mediana da casa. */
  mensal: GastoMensalPoint[]
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

const MESES = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]
const shortMes = (iso: string) => MESES[Number(iso.split('-')[1]) - 1] ?? iso

/**
 * Gráficos de gastos (Wave 7 Sprint 7.4 PR2 — bar categoria + line mensal).
 *
 * Recharts via dynamic-import em `gastos-chart-client.tsx` (Sprint 7.4 PR1).
 * Tokens semânticos via CSS vars (`--chart-1`, `--chart-3`, etc).
 * Bundle: chunk único contendo BarChart + LineChart (medido no PR).
 */
export function GastosChart({ categorias, mensal }: Props) {
  // Top 8 categorias (já vêm ordenadas por valor DESC do getGastosResumo).
  const barData = categorias.slice(0, 8).map((c) => ({
    categoria: c.categoriaDescricao,
    valor: Number(c.total),
  }))

  // Mensal: backend já retorna 12 meses com 0 quando sem dado.
  const lineData = mensal.map((m) => ({
    mes: shortMes(m.mes),
    parlamentar: Number(m.valor),
    medianaCasa: Number(m.medianaCasa),
  }))

  const semBar = barData.length === 0
  const semLine =
    lineData.length === 0 ||
    lineData.every((d) => d.parlamentar === 0 && d.medianaCasa === 0)

  if (semBar && semLine) return null

  return (
    <div className="space-y-6">
      {semBar ? null : (
        <div>
          <h3 className="mb-2 text-foreground-muted text-xs uppercase tracking-wider">
            Por categoria (top 8)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
              >
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  tick={{
                    fill: 'hsl(var(--foreground-muted))',
                    fontSize: 11,
                  }}
                  tickFormatter={brlShort}
                  type="number"
                />
                <YAxis
                  dataKey="categoria"
                  tick={{
                    fill: 'hsl(var(--foreground-muted))',
                    fontSize: 11,
                  }}
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
        </div>
      )}

      {semLine ? null : (
        <div>
          <h3 className="mb-2 text-foreground-muted text-xs uppercase tracking-wider">
            Mensal — parlamentar vs mediana da casa
          </h3>
          <p className="mb-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full bg-[hsl(var(--chart-1))]"
              />
              Parlamentar
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <span
                aria-hidden
                className="h-0.5 w-4 rounded-full border-[hsl(var(--chart-3))] border-t-2 border-dashed"
              />
              Mediana da casa
            </span>
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={lineData}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="mes"
                  tick={{
                    fill: 'hsl(var(--foreground-muted))',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{
                    fill: 'hsl(var(--foreground-muted))',
                    fontSize: 11,
                  }}
                  tickFormatter={brlShort}
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
                <Line
                  dataKey="parlamentar"
                  dot={false}
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="medianaCasa"
                  dot={false}
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
