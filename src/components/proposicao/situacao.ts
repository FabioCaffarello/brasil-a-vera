// Rótulos + classes de token por situação de proposição. Extraído do
// ProposicaoCard (Sprint 4.2 / Wave 6) para reuso pelo card de listagem e
// pelo drawer de preview — o badge de situação aparece nos dois.

export const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

/**
 * Mapeamento situação → tokens semânticos (mantido vs Sprint 4.2).
 *
 * - TRAMITANDO: active, em progresso → bg-fg-brand/20 + text-fg-brand (subtle)
 * - APROVADA: outcome positivo → bg-success/20 + text-fg-success (subtle)
 * - REJEITADA: outcome negativo → bg-error/20 + text-fg-error
 * - ARQUIVADA: inativo → bg-surface-raised + text-fg-tertiary
 * - TRANSFORMADA_EM_NORMA: pinnacle outcome (lei!) → par on-color sólido do
 *   RDS bg-success-solid + text-fg-on-success (emerald-700/branco, estável
 *   nos dois temas, ADR-039 / #230). Visual hierarchy: solid > subtle.
 */
export const SITUACAO_CLASSES: Record<string, string> = {
  TRAMITANDO: 'bg-fg-brand/20 text-fg-brand',
  APROVADA: 'bg-success/20 text-fg-success',
  REJEITADA: 'bg-error/20 text-fg-error',
  ARQUIVADA: 'bg-surface-raised text-fg-tertiary',
  TRANSFORMADA_EM_NORMA: 'bg-success-solid text-fg-on-success',
}

/** Classes do badge de situação, com fallback para ARQUIVADA (inativo). */
export function situacaoClasses(situacao: string): string {
  return SITUACAO_CLASSES[situacao] ?? SITUACAO_CLASSES.ARQUIVADA
}

/** Rótulo legível da situação, com fallback para o valor cru. */
export function situacaoLabel(situacao: string): string {
  return SITUACAO_LABELS[situacao] ?? situacao
}
