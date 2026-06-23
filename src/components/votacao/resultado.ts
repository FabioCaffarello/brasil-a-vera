// Fonte única do badge de resultado de votação (ADR-053).
//
// O par aprovada/rejeitada estava hardcoded inline em 3 lugares (votacao-card,
// home/card-votacoes-semana e o perfil-header da votação). `resultadoStatus()`
// centraliza rótulo + `tone` do RDS `DataBadge`, espelhando o `situacaoStatus`
// das proposições.

import type { DataBadgeTone } from '@fabio.caffarello/react-design-system/server'

/** Rótulo + tom do badge de resultado, prontos para `<DataBadge {...} />`. */
export function resultadoStatus(aprovada: boolean): {
  label: string
  tone: DataBadgeTone
} {
  return aprovada
    ? { label: 'Aprovada', tone: 'success' }
    : { label: 'Rejeitada', tone: 'error' }
}
