'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import { getTrustLevelColor, getTrustLevelLabel } from '@/lib/trust'
import { TRUST_LEVEL_DESCRIPTIONS, type TrustLevel } from '@/shared/trust'

export function TrustBadge({ trustLevel }: { trustLevel: TrustLevel }) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const containerRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handlePointer(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
    }
  }, [open])

  const label = getTrustLevelLabel(trustLevel)
  const description = TRUST_LEVEL_DESCRIPTIONS[trustLevel]

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover é sinal visual para mouse; teclado/screen reader interagem via o <button> filho com aria-describedby.
    <span
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={open}
        aria-label={`Nível de confiança ${trustLevel}: ${label}. Saiba mais.`}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className={`inline-flex cursor-help items-center rounded border px-2 py-0.5 font-medium text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 ${getTrustLevelColor(trustLevel)}`}
      >
        {trustLevel} — {label}
      </button>
      <span
        className="absolute top-full left-0 z-20 mt-1 w-64 rounded-md border border-line-default bg-surface-base p-3 text-fg-primary text-xs leading-snug shadow-lg"
        hidden={!open}
        id={tooltipId}
        role="tooltip"
      >
        <p className="font-medium text-fg-primary">{label}</p>
        <p className="mt-1 text-fg-tertiary">{description}</p>
        <Link
          className="mt-2 inline-block text-fg-brand underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href="/#piramide-confianca"
        >
          Saiba mais sobre a Pirâmide de Confiança
        </Link>
      </span>
    </span>
  )
}
