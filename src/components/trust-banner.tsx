import { TrustBadge } from '@/components/trust/trust-badge'
import type { TrustLevel } from '@/shared/trust'

interface Props {
  level: TrustLevel
  message: string
}

// Banner discreto que sinaliza o trust level da listagem inteira. Evita
// poluir cada card com badge repetido, mantendo o princípio de "trust em
// toda a UI" satisfeito.
//
// Sprint 4.2 PR 3 — migrado para tokens semânticos OKLCH.
export function TrustBanner({ level, message }: Props) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-foreground-muted text-xs">
      <TrustBadge trustLevel={level} />
      <span>{message}</span>
    </div>
  )
}
