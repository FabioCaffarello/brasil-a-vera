'use client'

// Badge de nível de confiança (L1–L4) com tooltip educativo. Consolidado no
// `Tooltip` do RDS (ADR-053) após o v4.8 entregar `content: ReactNode` +
// `interactive` (issue #251) — antes era ~60 linhas hand-rolled (useState/
// useRef/useEffect + click-outside + posicionamento + aria). O modo
// `interactive` mantém o painel aberto (grace-period) e permite alcançar o
// link "Saiba mais" por mouse e teclado.

import { Tooltip } from '@fabio.caffarello/react-design-system/granular'
import Link from 'next/link'

import { getTrustLevelColor, getTrustLevelLabel } from '@/lib/trust'
import { TRUST_LEVEL_DESCRIPTIONS, type TrustLevel } from '@/shared/trust'

export function TrustBadge({ trustLevel }: { trustLevel: TrustLevel }) {
  const label = getTrustLevelLabel(trustLevel)
  const description = TRUST_LEVEL_DESCRIPTIONS[trustLevel]

  return (
    <Tooltip
      content={
        <div className="w-64 space-y-2 text-xs leading-snug">
          <p className="font-medium text-fg-primary">{label}</p>
          <p className="text-fg-tertiary">{description}</p>
          <Link
            className="inline-block text-fg-brand underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
            href="/#piramide-confianca"
          >
            Saiba mais sobre a Pirâmide de Confiança
          </Link>
        </div>
      }
      interactive
      position="bottom"
    >
      <button
        aria-label={`Nível de confiança ${trustLevel}: ${label}. Saiba mais.`}
        className={`inline-flex cursor-help items-center rounded border px-2 py-0.5 font-medium text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 ${getTrustLevelColor(trustLevel)}`}
        type="button"
      >
        {trustLevel} — {label}
      </button>
    </Tooltip>
  )
}
