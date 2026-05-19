'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface VotacaoVotosData {
  sim: number
  nao: number
  abstencao: number
  ausentes: number
}

interface Props {
  data: VotacaoVotosData
}

// Tipos minimalistas para o tooltip — Recharts 3.x.
type TooltipPayload = Array<{
  value?: number | string
  payload?: Record<string, unknown>
}>
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload
}

interface CategoriaSlot {
  key: 'sim' | 'nao' | 'abstencao' | 'ausentes'
  label: string
  cssVar: string
}

// Cores semânticas idênticas ao chart Wave 8 — manter consistência
// visual cross-contexto (mesma cor de SIM em proposição e votação).
// Justificadas como sinal (decisão de voto), não estética.
const CATEGORIAS: readonly CategoriaSlot[] = [
  { key: 'sim', label: 'Sim', cssVar: '--success' },
  { key: 'nao', label: 'Não', cssVar: '--destructive' },
  { key: 'abstencao', label: 'Abstenção', cssVar: '--foreground-muted' },
  { key: 'ausentes', label: 'Ausentes', cssVar: '--warning' },
] as const

function VotosTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const row = item.payload as
    | { label: string; valor: number; pct: number }
    | undefined
  if (!row) return null
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{row.label}</p>
      <p className="mt-0.5 tabular-nums text-foreground">
        {row.valor.toLocaleString('pt-BR')} {row.valor === 1 ? 'voto' : 'votos'}{' '}
        · {row.pct}%
      </p>
    </div>
  )
}

/**
 * Chart "Votos consolidados" do detalhe de votação — Wave 9 Sprint 9.3 PR1.
 *
 * Donut SIM/NÃO/Abstenção/Ausentes da votação única. Adaptação do
 * VotosConsolidadosChart Wave 8 (que agrega múltiplas votações de uma
 * proposição) — aqui só uma votação, sem slot "última destacada".
 *
 * Cores semânticas por categoria (--success, --destructive,
 * --foreground-muted, --warning). Centro do donut mostra total nominal.
 *
 * Nota sobre obstrução: o agregado `votacao` não tem coluna obstrucao —
 * obstrução só existe em `voto_nominal.voto='OBSTRUCAO'`. Para o donut
 * consolidado, "ausentes" engloba obstrução implicitamente.
 */
export function VotacaoVotosConsolidadosChart({ data }: Props) {
  const total = data.sim + data.nao + data.abstencao + data.ausentes

  if (total === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Votação simbólica — sem voto individual registrado.
      </p>
    )
  }

  const chartData = CATEGORIAS.map((c) => {
    const valor = data[c.key]
    return {
      key: c.key,
      label: c.label,
      valor,
      pct: Math.round((valor / total) * 100),
      cssVar: c.cssVar,
    }
  }).filter((d) => d.valor > 0)

  return (
    <figure
      aria-label={`Distribuição de ${total} votos: ${chartData
        .map((d) => `${d.label} ${d.valor} (${d.pct}%)`)
        .join(', ')}`}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
        {/* Donut */}
        <div className="relative h-44 w-full sm:h-44 sm:w-44">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Tooltip
                content={(props: unknown) => (
                  <VotosTooltip {...(props as CustomTooltipProps)} />
                )}
              />
              <Pie
                cx="50%"
                cy="50%"
                data={chartData}
                dataKey="valor"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="hsl(var(--surface))"
                strokeWidth={2}
              >
                {chartData.map((d) => (
                  <Cell fill={`hsl(var(${d.cssVar}))`} key={d.key} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="font-semibold text-2xl text-foreground tabular-nums">
              {total.toLocaleString('pt-BR')}
            </span>
            <span className="text-foreground-muted text-xs">votos</span>
          </div>
        </div>

        {/* Legenda + percentuais */}
        <ul className="space-y-1.5 text-sm">
          {chartData.map((d) => (
            <li className="flex items-center gap-2" key={d.key}>
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: `hsl(var(${d.cssVar}))` }}
              />
              <span className="flex-1 text-foreground">{d.label}</span>
              <span className="tabular-nums text-foreground-muted">
                {d.valor.toLocaleString('pt-BR')}
              </span>
              <span className="tabular-nums text-foreground-subtle">
                {d.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}
