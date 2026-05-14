import { TrustBadge } from '@/components/trust/trust-badge'
import type { TrustLevel } from '@/shared/trust'

interface Props {
  level: TrustLevel
  message: string
}

// Banner discreto que sinaliza o trust level da listagem inteira. Evita
// poluir cada card com badge repetido, mantendo o princípio de "trust em
// toda a UI" satisfeito.
export function TrustBanner({ level, message }: Props) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      <TrustBadge trustLevel={level} />
      <span>{message}</span>
    </div>
  )
}
