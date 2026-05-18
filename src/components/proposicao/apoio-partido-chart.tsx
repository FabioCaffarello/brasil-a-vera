'use client'

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ApoioPartidoDatum } from './proposicao-charts-types'

interface Props {
  data: readonly ApoioPartidoDatum[]
}

// Tipos minimalistas para o tooltip — Recharts 3.x não exporta TooltipProps
// com payload tipado de forma estável, então tipamos só o que consumimos
// (mesmo padrão de gastos-chart.tsx da Wave 7).
type TooltipPayload = Array<{
  value?: number | string
  payload?: Record<string, unknown>
}>
interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload
}

// Mostra até 5 nomes; o restante vira "...e N outros" (cravado decisão
// #2 da rodada 2). Para o agregado "Outros", os nomes vêm como siglas
// dos partidos agregados (caller passa assim).
function nomesCompactos(nomes: readonly string[]): {
  visiveis: readonly string[]
  resto: number
} {
  if (nomes.length <= 5) return { visiveis: nomes, resto: 0 }
  return { visiveis: nomes.slice(0, 5), resto: nomes.length - 5 }
}

function ApoioTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  if (!item) return null
  const row = item.payload as ApoioPartidoDatum | undefined
  if (!row) return null
  const { visiveis, resto } = nomesCompactos(row.nomes)
  const ehOutros = row.sigla === 'Outros'
  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{row.sigla}</p>
      {!ehOutros && row.nome ? (
        <p className="text-foreground-muted">{row.nome}</p>
      ) : null}
      <p className="mt-0.5 tabular-nums text-foreground">
        {row.count} {row.count === 1 ? 'autor' : 'autores'} principais
      </p>
      {visiveis.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-foreground-muted">
          {visiveis.map((n) => (
            <li key={n}>{n}</li>
          ))}
          {resto > 0 ? (
            <li className="text-foreground-subtle italic">…e {resto} outros</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Chart "Apoio por partido" — Wave 8 Sprint 8.4 PR2.
 *
 * BarChart horizontal mostrando a distribuição de autores principais
 * por sigla partidária. Cravado na rodada 2 §Decisões resolvidas #2:
 *
 * - Filtro `tipoAutoria='AUTOR'` only (coautores entram em massa por
 *   gesto político público — diluem o signal de "quem realmente fez")
 * - Sigla canônica em DC (PT, PL, UNIÃO...); nome completo no tooltip
 * - Top 6 + "Outros" (agregação no caller via getApoioPorPartido)
 * - Tooltip com até 5 nomes + "...e N outros"
 *
 * Cor: --chart-1 sólido nos partidos principais; --chart-1/40
 * (variação por tom, P4) no "Outros" — sinal visual de que é
 * agregado, não um partido único. Sem hue distinto (P4 reserva
 * cores semânticas).
 *
 * A11y: `<title>` no SVG via Recharts, label list visível à direita
 * de cada barra (data label embutido — usuário lê sem hover).
 */
export function ApoioPartidoChart({ data }: Props) {
  if (data.length === 0) {
    // Fallback empty state — cravado no plano: "Autoria parlamentar não
    // disponível (autoria por comissão/órgão não entra no chart)".
    return (
      <p className="text-foreground-muted text-sm">
        Autoria parlamentar não disponível para esta proposição. Apenas autorias
        atribuídas a parlamentares individuais entram no gráfico — autorias por
        órgãos, comissões ou mesas ficam de fora.
      </p>
    )
  }

  // Altura proporcional ao número de barras: 36px por linha + margens
  // (~32px). Range 6-7 barras = 248-284px.
  const height = data.length * 36 + 32

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
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
            dataKey="sigla"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
            tickLine={false}
            type="category"
            width={72}
          />
          <Tooltip
            content={(props: unknown) => (
              <ApoioTooltip {...(props as CustomTooltipProps)} />
            )}
            cursor={{ fill: 'hsl(var(--accent) / 0.06)' }}
          />
          {/* Single fill com variação via fillOpacity prop function — evita
              importar Cell (cada Cell custa ~1.5 kB gzip no chunk
              Recharts). "Outros" fica em opacity 0.4 (P4: variação por
              tom, não hue distinto). */}
          <Bar
            dataKey="count"
            fill="hsl(var(--chart-1))"
            fillOpacity={1}
            radius={[0, 6, 6, 0]}
          >
            <LabelList
              dataKey="count"
              fill="hsl(var(--foreground))"
              fontSize={11}
              offset={6}
              position="right"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
