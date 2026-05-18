// Regra de domínio: classificação do estado de exibição da mini-barra de
// progresso de tramitação no ProposicaoCard v2.
//
// Cravada na rodada 2 do plano Wave 8 (§Contratos de fallback —
// ProposicaoCard v2). Honra o princípio P2 (honestidade do dado): a
// barra de progresso SÓ renderiza quando há marcos suficientes para
// posicionar com sentido. Em proposições sem tramitação registrada ou
// com poucos eventos, mostra texto subtle no lugar.
//
// Aplicada em src/components/proposicao/proposicao-card.tsx (Wave 8
// Sprint 8.1 PR4).

/** Mínimo de eventos para considerar que há marcos suficientes para
 * posicionar a barra. < 3 → mostrar texto "Apresentada há N dias". */
export const MIN_EVENTOS_BARRA = 3

/** Limite de dias para flagrar dados obsoletos (acima → tooltip de aviso).
 * Cravado em 365 — 1 ano sem movimentação é o threshold útil cívico (P7
 * proposição é ciclo de vida). */
export const LIMITE_DIAS_OBSOLETOS = 365

export type EstadoTramitacaoCard =
  | {
      kind: 'com_marcos'
      ultimoOrgao: string
      diasEmTramitacao: number
      obsoleto: boolean
    }
  | { kind: 'sem_marcos_relevantes'; diasEmTramitacao: number }
  | { kind: 'sem_tramitacao_registrada' }

/**
 * Classifica o estado da mini-barra de progresso a partir dos campos
 * agregados (`n_eventos_tramitacao`, `ultimo_orgao`,
 * `dias_em_tramitacao`, `dias_desde_ultima_tramitacao`).
 *
 * Pura — testável sem DB. Aceita null/undefined nos campos do agregado
 * (proposição sem linha agregada vira `sem_tramitacao_registrada`).
 */
export function classifyTramitacaoCard(input: {
  nEventosTramitacao: number | null | undefined
  ultimoOrgao: string | null | undefined
  diasEmTramitacao: number | null | undefined
  diasDesdeUltimaTramitacao: number | null | undefined
}): EstadoTramitacaoCard {
  const eventos = input.nEventosTramitacao ?? 0
  if (eventos === 0) {
    return { kind: 'sem_tramitacao_registrada' }
  }

  const dias = input.diasEmTramitacao ?? 0
  if (eventos < MIN_EVENTOS_BARRA || !input.ultimoOrgao) {
    return { kind: 'sem_marcos_relevantes', diasEmTramitacao: dias }
  }

  const desdeUltima = input.diasDesdeUltimaTramitacao ?? 0
  return {
    kind: 'com_marcos',
    ultimoOrgao: input.ultimoOrgao,
    diasEmTramitacao: dias,
    obsoleto: desdeUltima > LIMITE_DIAS_OBSOLETOS,
  }
}

/** Marcos canônicos da barra (5 etapas do ciclo legislativo). Ordem
 * fixa, não depende de casa de origem na visualização compacta do card
 * (granularidade fina vai no Sprint 8.3 PR4 — barra no detalhe). */
export const MARCOS_TRAMITACAO = [
  'Apresentação',
  'Comissões',
  'Plenário',
  'Câmara revisora',
  'Sanção',
] as const

export type MarcoTramitacao = (typeof MARCOS_TRAMITACAO)[number]

/**
 * Mapeia o `ultimo_orgao` para a posição corrente na barra de 5 marcos.
 * Heurística por substring case-insensitive. Default 2 (Comissões) —
 * estado mais comum em proposições em tramitação.
 *
 * Refinado quando a `situacao` é terminal: APROVADA / TRANSFORMADA_EM_NORMA
 * forçam marco 5 (Sanção); REJEITADA / ARQUIVADA também vão para 5 mas
 * com semântica diferente (fim do ciclo — caller decide estilo).
 */
export function inferirMarcoAtual(
  ultimoOrgao: string,
  situacao: string,
): 1 | 2 | 3 | 4 | 5 {
  // Situação terminal manda no marco — fonte da verdade > heurística textual.
  if (situacao === 'APROVADA' || situacao === 'TRANSFORMADA_EM_NORMA') {
    return 5
  }
  if (situacao === 'REJEITADA' || situacao === 'ARQUIVADA') {
    return 5
  }

  const lower = ultimoOrgao.toLowerCase()

  // Sanção/publicação/veto presidencial.
  if (
    lower.includes('sanção') ||
    lower.includes('sancao') ||
    lower.includes('publica') ||
    lower.includes('veto')
  ) {
    return 5
  }

  // Câmara revisora — proposição já saiu da casa origem.
  if (lower.includes('senado federal') || lower.includes('mesa do senado')) {
    return 4
  }

  // Plenário (qualquer casa).
  if (lower.includes('plenário') || lower.includes('plenario')) {
    return 3
  }

  // Comissões (CCJ, CTASP, comitês, etc).
  if (
    lower.includes('comiss') ||
    lower.startsWith('ccj') ||
    lower.startsWith('ct')
  ) {
    return 2
  }

  // Default — proposição em órgão não classificado, geralmente despacho
  // inicial / mesa. Assume Comissões (etapa 2) como expectativa.
  return 2
}
