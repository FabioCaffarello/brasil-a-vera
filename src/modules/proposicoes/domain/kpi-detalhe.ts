// Regra de domínio: construção dos 4 slots do KpiStrip do detalhe da
// proposição (Wave 8 Sprint 8.2 PR1).
//
// Cravada na rodada 2 do plano Wave 8 (§Decisões resolvidas #1 +
// §Contratos de fallback — KpiStrip detalhe). Pura — não toca DOM nem
// React, apenas mapeia dados → estrutura serializável que a página
// passa para o componente KpiStrip.
//
// Decisão de design (rodada 2):
// - Slot 1 — Situação (chip de estado + sub-line última movimentação)
// - Slot 2 — Idade (dias em tramitação + hint condicional vs mediana)
// - Slot 3 — Apoio (N autores + hint P partidos · U UFs)
// - Slot 4 — Votações (N + hint X aprovadas · Y rejeitadas)
//
// P2 — honestidade do dado: cada slot tem regra de fallback que suprime
// hint ou valor quando dado é insuficiente. Não renderizar é melhor que
// renderizar número falso.

export type KpiTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'muted'

export interface KpiSlot {
  /** Label do slot (visível em caps abaixo do value). */
  label: string
  /** Valor principal — number ou string curta narrativa. */
  value: string
  /** Hint opcional abaixo do label. Suprimido quando regra cai em fallback. */
  hint?: string
  /** Tom semântico do hint. */
  tone?: KpiTone
}

export interface ProposicaoStatsInput {
  diasEmTramitacao: number
  diasDesdeUltimaTramitacao: number | null
  nAutores: number
  nPartidosAutores: number
  nUfsAutores: number
  nVotacoes: number
  nVotacoesAprovadas: number
  nVotacoesRejeitadas: number
  nEventosTramitacao: number
  ultimoOrgao: string | null
  medianaDiasTipoReferencia: number | null
}

// Mapeamento situacao → label visível + tone semântico. Espelha o
// padrão de cores do ProposicaoCard (Sprint 8.1 PR4) — TRAMITANDO neutro,
// APROVADA/TRANSFORMADA_EM_NORMA verde, REJEITADA/ARQUIVADA vermelho.
const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

const SITUACAO_TONES: Record<string, KpiTone> = {
  TRAMITANDO: 'default',
  APROVADA: 'success',
  REJEITADA: 'destructive',
  ARQUIVADA: 'muted',
  TRANSFORMADA_EM_NORMA: 'success',
}

/** Limite (em dias) acima do qual flagra hint warning de "obsoleto" na
 * Situação. Mesmo threshold do ProposicaoCard v2 (1 ano sem
 * movimentação = sinal cívico de cuidado). */
export const LIMITE_DIAS_OBSOLETOS_DETALHE = 365

function buildSlotSituacao(
  situacao: string,
  stats: ProposicaoStatsInput | null,
): KpiSlot {
  const label = SITUACAO_LABELS[situacao] ?? situacao
  const tone = SITUACAO_TONES[situacao] ?? 'default'

  if (
    !stats ||
    stats.nEventosTramitacao === 0 ||
    stats.diasDesdeUltimaTramitacao === null
  ) {
    return { label: 'Situação', value: label, tone }
  }

  const dias = stats.diasDesdeUltimaTramitacao
  const orgao = stats.ultimoOrgao
  // Hint narrativo. Em órgão presente: "Última mov. há N dias em X".
  // Sem órgão (defensivo): "Última mov. há N dias".
  const hintBase = orgao
    ? `Última mov. há ${dias} ${dias === 1 ? 'dia' : 'dias'} em ${orgao}`
    : `Última mov. há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  // Tom warning override: situação TRAMITANDO + obsoleta = sinal cívico.
  const hintTone: KpiTone =
    situacao === 'TRAMITANDO' && dias > LIMITE_DIAS_OBSOLETOS_DETALHE
      ? 'warning'
      : tone
  return { label: 'Situação', value: label, hint: hintBase, tone: hintTone }
}

function buildSlotIdade(
  tipo: string,
  stats: ProposicaoStatsInput | null,
): KpiSlot {
  if (!stats || stats.nEventosTramitacao === 0) {
    return { label: 'Idade', value: 'Idade não calculável', tone: 'muted' }
  }
  const dias = stats.diasEmTramitacao
  const value = `${dias} ${dias === 1 ? 'dia' : 'dias'}`
  const mediana = stats.medianaDiasTipoReferencia
  if (mediana === null) {
    // Amostra insuficiente para comparação → suprime hint (P2).
    return { label: 'Idade', value }
  }
  // Hint comparativo. Tom depende: muito acima da mediana = warning
  // (cívico — "parada vs pares"); muito abaixo = success (rápida).
  // Threshold 1.5x para warning, 0.5x para success (faixa neutra
  // larga para não dramatizar).
  const ratio = dias / mediana
  const tone: KpiTone =
    ratio >= 1.5 ? 'warning' : ratio <= 0.5 ? 'success' : 'default'
  return {
    label: 'Idade',
    value,
    hint: `vs mediana ${mediana} dias para ${tipo}`,
    tone,
  }
}

function buildSlotApoio(stats: ProposicaoStatsInput | null): KpiSlot {
  if (!stats || stats.nAutores === 0) {
    return { label: 'Apoio', value: 'Autoria não cadastrada', tone: 'muted' }
  }
  const value = `${stats.nAutores} ${stats.nAutores === 1 ? 'autor' : 'autores'}`
  if (stats.nPartidosAutores === 0) {
    // Autoria só por órgão (Comissão, Mesa, etc) — hint subtle informativo.
    return { label: 'Apoio', value, hint: 'Autoria por órgão', tone: 'muted' }
  }
  const ufsPart =
    stats.nUfsAutores > 0
      ? ` · ${stats.nUfsAutores} ${stats.nUfsAutores === 1 ? 'UF' : 'UFs'}`
      : ''
  return {
    label: 'Apoio',
    value,
    hint: `${stats.nPartidosAutores} ${stats.nPartidosAutores === 1 ? 'partido' : 'partidos'}${ufsPart}`,
  }
}

function buildSlotVotacoes(stats: ProposicaoStatsInput | null): KpiSlot {
  if (!stats || stats.nVotacoes === 0) {
    return { label: 'Votações', value: 'Nenhuma ainda', tone: 'muted' }
  }
  const value = `${stats.nVotacoes} ${stats.nVotacoes === 1 ? 'votação' : 'votações'}`
  const partes: string[] = []
  if (stats.nVotacoesAprovadas > 0) {
    partes.push(`${stats.nVotacoesAprovadas} aprovadas`)
  }
  if (stats.nVotacoesRejeitadas > 0) {
    partes.push(`${stats.nVotacoesRejeitadas} rejeitadas`)
  }
  if (partes.length === 0) {
    return { label: 'Votações', value }
  }
  // Tom success se predominam aprovadas, destructive se rejeitadas, default
  // se misturado.
  const tone: KpiTone =
    stats.nVotacoesAprovadas > stats.nVotacoesRejeitadas
      ? 'success'
      : stats.nVotacoesRejeitadas > stats.nVotacoesAprovadas
        ? 'destructive'
        : 'default'
  return { label: 'Votações', value, hint: partes.join(' · '), tone }
}

/**
 * Constrói os 4 KpiSlots do detalhe. Pura — entrada serializável,
 * saída serializável. Caller (page.tsx) mapeia cada slot para `KpiItem`
 * do design system adicionando `icon` opcional.
 *
 * Aceita `stats: null` quando a proposição não tem linha agregada
 * (seed não rodou ou row órfã). Todos os 4 slots cair em fallbacks
 * honestos nesse caso.
 */
export function buildKpiSlotsDetalhe(input: {
  tipo: string
  situacao: string
  stats: ProposicaoStatsInput | null
}): [KpiSlot, KpiSlot, KpiSlot, KpiSlot] {
  return [
    buildSlotSituacao(input.situacao, input.stats),
    buildSlotIdade(input.tipo, input.stats),
    buildSlotApoio(input.stats),
    buildSlotVotacoes(input.stats),
  ]
}
