'use client'

// Item da inbox de alertas — Wave 10 Etapa 7.4.
//
// `<details>` HTML nativo (sem peer dep Radix Accordion). Quando o
// usuário expande pela primeira vez, dispara fetch POST para
// `/api/painel/alertas/recebidos/[id]/read` marcando como lida.
// UX otimista: badge "Novo" some imediato; revert em erro.
//
// HTML do body é pré-renderizado server-side em ListaRecebidos
// (markdown vem do composer, não user-provided — trust implícito;
// injeção via dangerouslySetInnerHTML é OK aqui).

import { useState } from 'react'

import { cn } from '@/lib/cn'

interface Props {
  id: string
  subject: string
  scheduledFor: string // ISO — Date não serializa entre RSC e client
  initialReadAt: string | null
  bodyHtml: string
}

export function ItemRecebido({
  id,
  subject,
  scheduledFor,
  initialReadAt,
  bodyHtml,
}: Props) {
  const [readAt, setReadAt] = useState<string | null>(initialReadAt)

  async function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) return
    if (readAt !== null) return // já marcado lido

    const now = new Date().toISOString()
    setReadAt(now) // otimismo

    try {
      const res = await fetch(`/api/painel/alertas/recebidos/${id}/read`, {
        method: 'POST',
      })
      if (!res.ok) {
        setReadAt(null) // revert
      }
    } catch {
      setReadAt(null) // revert
    }
  }

  const isNovo = readAt === null

  return (
    <details
      className={cn(
        'group rounded-lg border border-border bg-surface transition-colors',
        isNovo && 'border-brand/40 bg-brand/5',
      )}
      onToggle={handleToggle}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        {isNovo && (
          <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 font-medium text-brand-foreground text-xs">
            Novo
          </span>
        )}
        <span className="flex-1 truncate text-foreground text-sm">
          {subject}
        </span>
        <time className="text-foreground-muted text-xs" dateTime={scheduledFor}>
          {formatDate(scheduledFor)}
        </time>
        <span
          aria-hidden="true"
          className="text-foreground-muted text-xs transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="border-border-strong border-t p-4">
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown vem do composer interno (server-side), não user-provided
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
          className="report-body prose-sm max-w-none"
        />
      </div>
    </details>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}
