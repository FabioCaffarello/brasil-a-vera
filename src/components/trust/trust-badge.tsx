import type { TrustLevel } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { getTrustLevelColor, getTrustLevelLabel } from '@/lib/trust'

export function TrustBadge({ trustLevel }: { trustLevel: TrustLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${getTrustLevelColor(trustLevel)}`}
    >
      {trustLevel} — {getTrustLevelLabel(trustLevel)}
    </span>
  )
}
