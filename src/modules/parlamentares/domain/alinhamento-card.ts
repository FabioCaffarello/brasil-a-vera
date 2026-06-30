import { emFederacao } from '@/shared/federacoes'
import { ALINHAMENTO_AMOSTRA_MINIMA } from './alinhamento'

// Estado de EXIBIÇÃO do alinhamento de um parlamentar em cards/preview
// (distinto de `classifyAlinhamento` em ./alinhamento, que classifica um
// voto único). Extraído do ParlamentarCard (Wave 7 Sprint 7.1 PR4) para ser
// reusado pelo card de listagem E pelo drawer de preview sem duplicar a
// matriz de fallback.
//
// Matriz canônica no handoff `docs/design/WAVE-7-PLAN-HANDOFF.md`
// §Contrato de fallback. P2 — honestidade do dado: barra cheia em
// parlamentar sem dado quebra a tese do produto inteiro.
export type AlinhamentoCardState =
  | { kind: 'com_amostra'; percentual: number; votacoes: number }
  | { kind: 'amostra_insuficiente'; votacoes: number }
  | { kind: 'sem_dado'; senadoLegacy: boolean }
  | { kind: 'federacao' }

/**
 * Classifica o estado de exibição do alinhamento.
 *
 * Threshold usa `ALINHAMENTO_AMOSTRA_MINIMA` (= 50) para consistência com
 * `src/lib/queries/alinhamento.ts`, que flagra "amostra insuficiente" com o
 * mesmo valor.
 *
 * - com_amostra (votacoes ≥ 50 AND pct != null): barra + "X% alinhado · N votações"
 * - amostra_insuficiente (0 < votacoes < 50): texto subtle, SEM barra
 * - sem_dado (votacoes = 0): texto subtle, SEM barra
 * - sem_dado em SENADO: marca senadoLegacy para tooltip de cobertura parcial
 * - federacao (votacoes = 0 E partido em federação): ausência por construção
 *   (seed-agregados não encontra orientação pela sigla — join não casa com
 *   orientação publicada pela federação). Distinto de "sem_dado" — o dado
 *   existe, mas não é comparável pela sigla individual (ADR-041).
 */
export function classifyAlinhamentoCard(
  votacoes: number | null | undefined,
  pct: string | null | undefined,
  casa: string,
  partidoSigla?: string | null,
): AlinhamentoCardState {
  const v = votacoes ?? 0
  if (v === 0) {
    if (partidoSigla && emFederacao(partidoSigla)) {
      return { kind: 'federacao' }
    }
    return { kind: 'sem_dado', senadoLegacy: casa === 'SENADO' }
  }
  if (v < ALINHAMENTO_AMOSTRA_MINIMA || pct === null || pct === undefined) {
    return { kind: 'amostra_insuficiente', votacoes: v }
  }
  return { kind: 'com_amostra', percentual: Number(pct), votacoes: v }
}
