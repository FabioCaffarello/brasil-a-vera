// Regra de domínio: decisão de quando expor (ou suprimir) a mediana
// comparativa de "dias em tramitação por tipo de proposição".
//
// Cravada na rodada 2 do plano Wave 8 (docs/design/WAVE-8-PROPOSICOES-PLAN.md
// §Decisões resolvidas #1 — Estrutura do KpiStrip). Honra o princípio P2
// (honestidade do dado, TRUST-PYRAMID): comparações com amostras pequenas
// quebram o trust_level que o produto comunica.
//
// Aplicada em duas camadas:
// - **Seed** (Sprint 8.0 PR3, script seed:agregados:proposicao) — grava
//   NULL em `estatistica_proposicao_agregada.mediana_dias_tipo_referencia`
//   quando o tipo tem amostra insuficiente
// - **UI** (Sprint 8.2 PR1, KpiStrip detalhe) — verifica NULL na coluna e
//   suprime o hint comparativo no slot Idade

/**
 * Limite mínimo de amostra para a mediana ser exposta. Abaixo disso, a
 * comparação "vs mediana" é desonesta (P2 — honestidade do dado).
 *
 * 50 é o threshold cravado: amostras menores não dão signal estatisticamente
 * útil para tipos raros (MPV, PRC, PDC podem ter <50 ocorrências históricas
 * no banco). Alterar exige nova rodada com owner.
 */
export const MIN_AMOSTRA_MEDIANA = 50

export interface MedianaTipo {
  /** Mediana arredondada para inteiro de dias. */
  mediana: number
  /** N de proposições do tipo que entraram no cálculo. */
  amostra: number
}

/**
 * Aplica a regra de honestidade do dado: retorna `null` quando a amostra
 * é menor que MIN_AMOSTRA_MEDIANA, caso contrário retorna o par
 * `{ mediana, amostra }`. Pura — testável sem DB.
 */
export function decideMediana(
  amostra: number,
  mediana: number,
): MedianaTipo | null {
  if (amostra < MIN_AMOSTRA_MEDIANA) return null
  return { mediana, amostra }
}
