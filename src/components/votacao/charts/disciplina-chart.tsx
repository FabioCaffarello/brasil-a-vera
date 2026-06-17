'use client'

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { DisciplinaPartidoRow } from '@/lib/queries/votacoes'

// Opacidade decrescente por ranking (DESIGN-TOKENS §"Padrões de uso
// em charts"). Mesmo helper de gastos-chart.tsx.
const RANKING_OPACITY: readonly number[] = [
  1, 0.85, 0.7, 0.6, 0.5, 0.4, 0.3,
] as const
function rankingOpacity(idx: number): number {
  return RANKING_OPACITY[Math.min(idx, RANKING_OPACITY.length - 1)] ?? 0.3
}

interface Props {
  data: readonly DisciplinaPartidoRow[]
}

type TooltipPayload = Array<{
  value?: number | string
  payload?: Record<string, unknown>
}>
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload
}

const ORIENTACAO_LABEL: Record<string, string> = {
  SIM: 'Sim',
  NAO: 'Não',
  OBSTRUCAO: 'Obstrução',
}

function DisciplinaTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const row = item.payload as DisciplinaPartidoRow | undefined
  if (!row) return null
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{row.partido}</p>
      <ul className="space-y-0.5 tabular-nums text-foreground-muted">
        <li>
          Orientação:{' '}
          <span className="text-foreground">
            {ORIENTACAO_LABEL[row.orientacao] ?? row.orientacao}
          </span>
        </li>
        <li>
          Seguiram:{' '}
          <span className="text-success">
            {row.seguiram} de {row.totalAtivo}
          </span>
        </li>
        <li>
          Rebelaram: <span className="text-destructive">{row.rebelaram}</span>
        </li>
        <li className="mt-1 border-border border-t pt-1 font-medium text-foreground">
          Disciplina: {row.pctDisciplina.toFixed(0)}%
        </li>
      </ul>
    </div>
  )
}

/**
 * DisciplinaPartidariaChart — Wave 9 Sprint 9.4 PR1.
 *
 * BarChart horizontal: cada barra é um partido com orientação efetiva
 * (LIBERADO excluído pela query), com width proporcional ao
 * pctDisciplina (% dos parlamentares que seguiram a orientação).
 *
 * Cor única `--success` (não é gradient verde→vermelho) — disciplina é
 * cooperação intra-partidária, não polarização. LabelList à direita
 * mostra "{pct}%" como data label embutido (acessível sem hover).
 *
 * Ordenação preservada do server (descrescente por totalAtivo, depois
 * por sigla). Caller deve mostrar este chart APENAS quando há ≥1
 * partido com orientação efetiva — quando data.length === 0, renderiza
 * mensagem honesta.
 */
export function DisciplinaPartidariaChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Esta votação não teve orientações de bancada registradas.
      </p>
    )
  }

  // Altura proporcional: 28px por partido + margens (~24px).
  const height = data.length * 28 + 24

  return (
    <figure
      aria-label={`Disciplina partidária — ${data.length} ${data.length === 1 ? 'partido' : 'partidos'} com orientação efetiva. Média: ${Math.round(data.reduce((acc, d) => acc + d.pctDisciplina, 0) / data.length)}%`}
      className="w-full"
      style={{ height }}
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
        >
          <XAxis
            axisLine={false}
            domain={[0, 100]}
            tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="partido"
            tick={{ fill: 'var(--foreground)', fontSize: 11 }}
            tickLine={false}
            type="category"
            width={64}
          />
          <Tooltip
            content={(props: unknown) => (
              <DisciplinaTooltip {...(props as CustomTooltipProps)} />
            )}
            cursor={{
              fill: 'color-mix(in oklch, var(--accent) 6%, transparent)',
            }}
          />
          <Bar
            dataKey="pctDisciplina"
            fill="var(--color-chart-2)"
            radius={[0, 4, 4, 0]}
          >
            {/* Opacidade decrescente por ranking de disciplina (a query
                já ordena por totalAtivo DESC). Disciplina não é "bom/ruim"
                (P2 honestidade) — usa --color-chart-2 (categórico), não
                --success. Cap em 0.3 preserva WCAG 1.4.11. */}
            {data.map((entry, idx) => (
              <Cell
                fill="var(--color-chart-2)"
                fillOpacity={rankingOpacity(idx)}
                key={entry.partido}
              />
            ))}
            <LabelList
              dataKey="pctDisciplina"
              fill="var(--foreground)"
              fontSize={11}
              formatter={(value) =>
                typeof value === 'number' ? `${value.toFixed(0)}%` : ''
              }
              offset={6}
              position="right"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
