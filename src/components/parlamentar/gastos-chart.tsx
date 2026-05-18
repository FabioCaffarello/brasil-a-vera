'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Recharts 3.x não exporta TooltipProps com payload tipado de forma
// estável; tooltip custom recebe shape do payload dinamicamente.
// Tipos minimalistas locais para o que de fato consumimos.
type TooltipPayload = Array<{
  value?: number | string
  dataKey?: string | number
  payload?: Record<string, unknown>
}>
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload
  label?: string | number
}

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

// Refinement dataviz (Wave 7 polish): tooltip rico com contexto além do
// valor cru — % do total, delta vs mediana — para que o usuário não
// precise calcular mentalmente.
function BarTooltip(props: CustomTooltipProps & { total: number }) {
  const { active, payload, total } = props
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const valor = Number(item.value ?? 0)
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">
        {String(item.payload?.categoria ?? '')}
      </p>
      <p className="mt-0.5 tabular-nums text-foreground">{brl.format(valor)}</p>
      <p className="text-foreground-muted">{pct}% do total CEAP no ano</p>
    </div>
  )
}

function LineTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const parl = payload.find((p) => p.dataKey === 'parlamentar')
  const med = payload.find((p) => p.dataKey === 'medianaCasa')
  const parlValue = Number(parl?.value ?? 0)
  const medValue = Number(med?.value ?? 0)
  const delta = parlValue - medValue
  const deltaLabel =
    medValue === 0
      ? ''
      : delta > 0
        ? `+${brl.format(Math.abs(delta))} acima`
        : delta < 0
          ? `−${brl.format(Math.abs(delta))} abaixo`
          : 'igual à mediana'
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{String(label ?? '')}</p>
      <div className="mt-1 space-y-0.5 tabular-nums">
        <p className="text-[hsl(var(--chart-1))]">
          Parlamentar: {brl.format(parlValue)}
        </p>
        <p className="text-foreground-muted">
          Mediana da casa: {brl.format(medValue)}
        </p>
        {deltaLabel ? (
          <p
            className={
              delta > 0
                ? 'text-warning'
                : delta < 0
                  ? 'text-success'
                  : 'text-foreground-muted'
            }
          >
            {deltaLabel}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Gráficos de gastos com refinement dataviz (Wave 7 polish — princípios
 * Tufte aplicados):
 *
 * - **Max data/ink**: grid muito sutil (border/40, dashed), axes sem
 *   linha (só ticks)
 * - **Hierarquia tipográfica**: título + subtítulo descritivo (com
 *   total no ano para Bar; janela 12m para Line)
 * - **Data labels embutidos no Bar** (valor à direita) — usuário lê
 *   sem hover
 * - **Tooltips ricos**: Bar com % do total; Line com delta absoluto +
 *   semântica (acima/abaixo da mediana, cor success/warning)
 * - **Cores semânticas no Line tooltip**: success quando abaixo da
 *   mediana (parlamentar gasta menos), warning quando acima
 *
 * Bundle: +LabelList importado (+0.3 kB gzip estimado, dentro do C1
 * do ADR-025 v0.2 = 105 kB).
 */
export function GastosChart({ categorias, mensal }: Props) {
  const barData = categorias.slice(0, 8).map((c) => ({
    categoria: c.categoriaDescricao,
    valor: Number(c.total),
  }))
  const totalBar = barData.reduce((acc, b) => acc + b.valor, 0)

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
        <section aria-labelledby="gastos-bar-titulo">
          <header className="mb-2">
            <h3
              className="font-medium text-foreground text-sm"
              id="gastos-bar-titulo"
            >
              Onde foi gasto
            </h3>
            <p className="text-foreground-muted text-xs">
              {barData.length} principais categorias · total{' '}
              <span className="tabular-nums text-foreground">
                {brl.format(totalBar)}
              </span>
            </p>
          </header>
          <div className="h-80 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="hsl(var(--border) / 0.4)"
                  strokeDasharray="2 4"
                />
                <XAxis
                  axisLine={false}
                  tick={{
                    fill: 'hsl(var(--foreground-muted))',
                    fontSize: 10,
                  }}
                  tickFormatter={brlShort}
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  dataKey="categoria"
                  tick={{
                    fill: 'hsl(var(--foreground))',
                    fontSize: 11,
                  }}
                  tickLine={false}
                  type="category"
                  width={148}
                />
                <Tooltip
                  content={(props: unknown) => (
                    <BarTooltip
                      {...(props as CustomTooltipProps)}
                      total={totalBar}
                    />
                  )}
                  cursor={{ fill: 'hsl(var(--accent) / 0.06)' }}
                />
                <Bar
                  dataKey="valor"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 6, 6, 0]}
                >
                  <LabelList
                    dataKey="valor"
                    fill="hsl(var(--foreground))"
                    fontSize={10}
                    formatter={(v) => brlShort(Number(v))}
                    offset={6}
                    position="right"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {semLine ? null : (
        <section aria-labelledby="gastos-line-titulo">
          <header className="mb-2">
            <h3
              className="font-medium text-foreground text-sm"
              id="gastos-line-titulo"
            >
              Quanto por mês vs casa
            </h3>
            <p className="text-foreground-muted text-xs">
              Comparação com a mediana mensal da casa do parlamentar
            </p>
          </header>
          <p className="mb-2 flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <span
                aria-hidden
                className="h-0.5 w-5 rounded-full bg-[hsl(var(--chart-1))]"
              />
              <span className="font-medium">Parlamentar</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <span
                aria-hidden
                className="h-0.5 w-5 rounded-full border-[hsl(var(--chart-3))] border-t-2 border-dashed"
              />
              Mediana da casa
            </span>
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={lineData}
                margin={{ top: 8, right: 16, bottom: 4, left: 4 }}
              >
                <CartesianGrid
                  stroke="hsl(var(--border) / 0.4)"
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="mes"
                  tick={{
                    fill: 'hsl(var(--foreground-muted))',
                    fontSize: 10,
                  }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{
                    fill: 'hsl(var(--foreground-muted))',
                    fontSize: 10,
                  }}
                  tickFormatter={brlShort}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  content={(props: unknown) => (
                    <LineTooltip {...(props as CustomTooltipProps)} />
                  )}
                  cursor={{
                    stroke: 'hsl(var(--accent) / 0.3)',
                    strokeWidth: 1,
                  }}
                />
                <Line
                  dataKey="medianaCasa"
                  dot={false}
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  dataKey="parlamentar"
                  dot={false}
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
