'use client'

import type { ProposicaoChartsProps } from './proposicao-charts-types'

/**
 * Charts da proposição — Wave 8 Sprint 8.4 PR1 (setup).
 *
 * Container raiz dos charts do detalhe. Estrutura preparada para
 * receber:
 * - PR2: BarChart "Apoio por partido" (props.apoioPartido)
 * - PR3: Donut/Stacked "Votos consolidados" (props.votacoes)
 *
 * Renderização atual (PR1):
 * - Sem caller integrado no app — apenas a infra de arquivos +
 *   tipos + wrapper dynamic. PR2 será o primeiro consumer em
 *   page.tsx do detalhe.
 * - Recharts NÃO importado ainda — chega no PR2 com o primeiro
 *   chart concreto. Benchmark de bundle delta é medido lá (não faz
 *   sentido medir sem código que use a lib).
 *
 * Padrão de Component Boundary (mesmo de gastos-chart da Wave 7):
 * - Este arquivo: 'use client' + Recharts (quando PR2 chegar)
 * - proposicao-charts-client.tsx: wrapper dynamic({ ssr: false })
 *   que Server Components consomem
 *
 * Por que `ssr: false` é necessário (rationale Wave 7 espelhado):
 * Recharts toca `window` no module init (ResponsiveContainer usa
 * ResizeObserver). Server-rendered o módulo nem carrega, o chart
 * cai no skeleton e hidrata client-side.
 */
export function ProposicaoCharts({
  apoioPartido,
  votacoes,
}: ProposicaoChartsProps) {
  // Sem ambos os charts implementados, render null.
  // PR2 adiciona `if (apoioPartido) { ... <BarChart /> ... }`
  // PR3 adiciona `if (votacoes) { ... <Donut /> ... }`
  const hasApoio = apoioPartido && apoioPartido.length > 0
  const hasVotacoes =
    votacoes &&
    votacoes.sim + votacoes.nao + votacoes.abstencao + votacoes.obstrucao > 0
  if (!hasApoio && !hasVotacoes) return null

  return (
    <div className="space-y-6">
      {/* PR2 placeholder: <ApoioPartidoChart data={apoioPartido} /> */}
      {/* PR3 placeholder: <VotosConsolidadosChart data={votacoes} /> */}
    </div>
  )
}
