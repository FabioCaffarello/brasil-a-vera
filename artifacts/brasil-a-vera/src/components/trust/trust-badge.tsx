'use client'

import { Link } from 'wouter'
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
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className={`inline-flex cursor-help items-center rounded border px-2 py-0.5 text-xs font-medium ${getTrustLevelColor(trustLevel)}`}
      >
        {trustLevel} — {label}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!open}
        className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-zinc-200 bg-white p-3 text-xs leading-snug text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="mt-1">{description}</p>
        <Link
          href="/#piramide-confianca"
          className="mt-2 inline-block text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
        >
          Saiba mais sobre a Pirâmide de Confiança
        </Link>
      </span>
    </span>
  )
}
