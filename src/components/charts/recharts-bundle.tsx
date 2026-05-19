'use client'

// Bundle compartilhado de charts client-side — Wave 8 Sprint 8.4 PR2.
//
// PROBLEMA QUE RESOLVE: cada wrapper `dynamic(() => import('./chart'))`
// cria seu próprio chunk JS que inclui o tree-shake de TODAS as deps
// — inclusive Recharts (~62 kB gzip). Turbopack NÃO deduplica Recharts
// entre dynamic imports distintos (medido no primeiro build deste PR:
// +109 kB gzip vs alvo ≤5 kB).
//
// SOLUÇÃO: ambos os wrappers dynamic apontam para este MESMO arquivo
// (re-exports). Turbopack agrupa as primitivas Recharts em UM único
// chunk compartilhado. Custo: usuário que visita /parlamentares/[id]
// E /proposicoes/[…] carrega o mesmo chunk uma vez (cached entre
// rotas). Trade-off aceitável: cada chart individual carrega TODO
// o bundle (~62 kB gzip), mas o aumento vs Wave 7 baseline é apenas
// o código do novo ApoioPartidoChart (~5 kB gzip).
//
// IMPACTO NA WAVE 7: o wrapper `gastos-chart-client.tsx` foi
// redirecionado para importar daqui. Não muda o comportamento visível
// (mesmo componente renderizado) — só muda o resolver do dynamic.

export { GastosChart } from '@/components/parlamentar/gastos-chart'
export { ApoioPartidoChart } from '@/components/proposicao/apoio-partido-chart'
export { VotosConsolidadosChart } from '@/components/proposicao/votos-consolidados-chart'
export { VotacaoVotosConsolidadosChart } from '@/components/votacao/charts/votos-consolidados-chart'
