'use client'

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface PorPartidoDatum {
  partidoSigla: string
  sim: number
  nao: number
  abstencao: number
  ausente: number
  obstrucao: number
  total: number
}

interface Props {
  data: readonly PorPartidoDatum[]
}

type TooltipPayload = Array<{
  value?: number | string
  payload?: Record<string, unknown>
}>
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload
}

// Mesmas cores semânticas do Donut consolidado (Wave 9 Sprint 9.3 PR1)
// — consistência cross-chart no mesmo domínio. Obstrução ganha
// foreground-subtle (sinal "votou ativamente mas pela ausência forçada
// do quórum"), distinto de ausente (--warning).
const SEGMENTOS = [
  { key: 'sim', label: 'Sim', cssVar: '--success' },
  { key: 'nao', label: 'Não', cssVar: '--destructive' },
  { key: 'abstencao', label: 'Abstenção', cssVar: '--foreground-muted' },
  { key: 'obstrucao', label: 'Obstrução', cssVar: '--foreground-subtle' },
  { key: 'ausente', label: 'Ausente', cssVar: '--warning' },
] as const

function PartidoTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const row = item.payload as PorPartidoDatum | undefined
  if (!row) return null
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{row.partidoSigla}</p>
      <ul className="space-y-0.5 tabular-nums text-foreground-muted">
        {SEGMENTOS.map((s) => {
          const valor = row[s.key]
          if (valor === 0) return null
          return (
            <li className="flex items-center gap-2" key={s.key}>
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: `hsl(var(${s.cssVar}))` }}
              />
              <span className="flex-1 text-foreground">{s.label}</span>
              <span>{valor}</span>
            </li>
          )
        })}
        <li className="mt-1 flex items-center gap-2 border-border border-t pt-1 font-medium text-foreground">
          <span className="flex-1">Total</span>
          <span>{row.total}</span>
        </li>
      </ul>
    </div>
  )
}

/**
 * Chart "Votação por partido" — Wave 9 Sprint 9.3 PR2.
 *
 * BarChart horizontal empilhada: cada linha é um partido, com até 5
 * segmentos coloridos (SIM/NÃO/Abstenção/Obstrução/Ausente). Substitui
 * a tabela votos-por-partido.tsx no detalhe (tabela vira fallback
 * acessível em <details>).
 *
 * Cores semânticas idênticas ao Donut consolidado (PR1) — consistência
 * cross-chart no mesmo domínio. Tooltip mostra detalhamento numérico
 * com legenda colorida.
 *
 * Ordem de empilhamento: ativos primeiro (sim → nao), depois abstenção
 * → obstrução → ausência. Visualmente lê "quem se posicionou" no
 * início da barra, "quem não participou" no fim.
 */
export function VotacaoPorPartidoChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Sem votos individuais registrados para esta votação.
      </p>
    )
  }

  // Altura proporcional: 28px por partido + margens (~24px). 30 partidos
  // (cenário típico) cabem em ~864px — caller já está em scroll-y do
  // SectionCard se exceder.
  const height = data.length * 28 + 24

  return (
    <figure
      aria-label={`Distribuição de votos por partido — ${data.length} ${data.length === 1 ? 'partido' : 'partidos'} com voto nominal registrado`}
      className="w-full"
      style={{ height }}
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <XAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--foreground-muted))', fontSize: 10 }}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="partidoSigla"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
            tickLine={false}
            type="category"
            width={64}
          />
          <Tooltip
            content={(props: unknown) => (
              <PartidoTooltip {...(props as CustomTooltipProps)} />
            )}
            cursor={{ fill: 'hsl(var(--accent) / 0.06)' }}
          />
          {SEGMENTOS.map((s, idx) => (
            <Bar
              dataKey={s.key}
              fill={`hsl(var(${s.cssVar}))`}
              key={s.key}
              radius={
                idx === SEGMENTOS.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]
              }
              stackId="votos"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
