// Fonte única do badge de situação de proposição (ADR-053).
//
// Antes de #569, o mapeamento situação→rótulo+cor estava duplicado e
// divergente em proposicao-card, preview-drawer e perfil-header (rótulos
// diferentes — 'Tramitando' vs 'Em tramitação' — e classes hardcoded). Agora
// `situacaoStatus()` é a única fonte: mapeia a situação para o vocabulário de
// `tone` do RDS `DataBadge`, consumido por card, drawer e header.

import type { DataBadgeTone } from '@fabio.caffarello/react-design-system/server'

export const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

/**
 * Situação → `tone` do RDS DataBadge (role semântico, soft-wash AA-verificado).
 *
 * - TRAMITANDO: em progresso → `primary` (brand)
 * - APROVADA: outcome positivo → `success`
 * - REJEITADA: outcome negativo → `error`
 * - ARQUIVADA: inativo → `neutral`
 * - TRANSFORMADA_EM_NORMA: virou lei (pinnacle) → `success`. Nota: o realce
 *   sólido bespoke (`bg-success-solid`, ADR-039/#230) foi aposentado ao adotar
 *   o vocabulário do RDS, que é uniformemente soft-wash; a distinção vs.
 *   APROVADA fica no rótulo ("Virou norma"). Reabrir como issue upstream se um
 *   estilo de alta ênfase for necessário (ADR-053 §gap→upstream).
 */
const SITUACAO_TONES: Record<string, DataBadgeTone> = {
  TRAMITANDO: 'primary',
  APROVADA: 'success',
  REJEITADA: 'error',
  ARQUIVADA: 'neutral',
  TRANSFORMADA_EM_NORMA: 'success',
}

/** Rótulo legível da situação, com fallback para o valor cru. */
export function situacaoLabel(situacao: string): string {
  return SITUACAO_LABELS[situacao] ?? situacao
}

/**
 * Rótulo + tom do badge de situação, prontos para `<DataBadge {...} />`.
 * Fallback `ARQUIVADA` (inativo/neutro) para situações desconhecidas.
 */
export function situacaoStatus(situacao: string): {
  label: string
  tone: DataBadgeTone
} {
  return {
    label: situacaoLabel(situacao),
    tone: SITUACAO_TONES[situacao] ?? SITUACAO_TONES.ARQUIVADA,
  }
}
