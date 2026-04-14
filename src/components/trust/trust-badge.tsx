import { getTrustLevelColor, getTrustLevelLabel } from '@/lib/trust'
import type { TrustLevel } from '@/shared/trust'

export function TrustBadge({ trustLevel }: { trustLevel: TrustLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${getTrustLevelColor(trustLevel)}`}
    >
      {trustLevel} — {getTrustLevelLabel(trustLevel)}
    </span>
  )
}
