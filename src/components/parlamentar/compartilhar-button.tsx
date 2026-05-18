'use client'

import { Copy, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/design-system/primitives/dialog'

interface Props {
  parlamentar: {
    nome: string
    partidoSigla: string
    uf: string
    casa: string
  }
}

const TEXTAREA_CLASS =
  'block min-h-[6rem] w-full resize-none rounded-md border border-border-strong bg-background px-3 py-2 font-mono text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const COPY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-background px-2.5 py-1.5 font-medium text-foreground text-xs hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function buildWhatsApp(parlamentar: Props['parlamentar'], url: string): string {
  const cargo = parlamentar.casa === 'CAMARA' ? 'Deputado' : 'Senador'
  return `📊 ${parlamentar.nome} (${parlamentar.partidoSigla}/${parlamentar.uf}) — ${cargo}\n\nVeja como vota, propõe e gasta no Brasil à Vera 🗳️\n\n${url}`
}

function buildTwitter(parlamentar: Props['parlamentar'], url: string): string {
  // Twitter conta URL como 23 chars + emojis ~2 chars/glyph.
  // Mensagem base ~120 chars + nome variável. Cortamos só se exceder 280.
  const base = `📊 ${parlamentar.nome} (${parlamentar.partidoSigla}/${parlamentar.uf}) — como vota, propõe e gasta no Brasil à Vera 🇧🇷\n\n${url}`
  if (base.length <= 280) return base
  // Fallback compacto para nomes longos
  return `📊 ${parlamentar.partidoSigla}/${parlamentar.uf}: como vota, propõe e gasta no Brasil à Vera 🇧🇷\n\n${url}`
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  } catch (_err) {
    toast.error('Não foi possível copiar. Selecione e copie manualmente.')
  }
}

/**
 * Botão "Compartilhar resumo" do PerfilHeader (Wave 7 Sprint 7.2 PR3).
 *
 * Dialog completo com:
 * - URL canônica da página (window.location.href, resolved post-mount
 *   para evitar SSR hydration mismatch)
 * - Texto pré-formatado para WhatsApp (emojis nativos do produto)
 * - Texto pré-formatado para X/Twitter (≤280 chars com fallback compacto
 *   para nomes longos)
 * - 3 botões "Copiar" (link, WhatsApp, X) via Clipboard API + toast
 *   sonner em sucesso/falha
 *
 * Sem instrumentação de eventos — handoff aceita "sem dado de uso
 * até Wave 9".
 */
export function CompartilharButton({ parlamentar }: Props) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    // Resolved no client para pegar o canônico real (host + path);
    // em SSR o componente não renderiza esses valores.
    setUrl(window.location.href)
  }, [])

  const whatsAppText = url ? buildWhatsApp(parlamentar, url) : ''
  const twitterText = url ? buildTwitter(parlamentar, url) : ''

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-background px-3 py-2 font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="button"
        >
          <Share2 aria-hidden className="h-4 w-4" />
          Compartilhar resumo
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar perfil</DialogTitle>
          <DialogDescription>
            {parlamentar.nome} ({parlamentar.partidoSigla}/{parlamentar.uf}) —
            copie o link ou um texto pré-formatado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            id="share-url"
            label="Link"
            text={url}
            onCopy={() => copyToClipboard(url, 'Link')}
            rows={1}
          />
          <Field
            id="share-whatsapp"
            label="WhatsApp"
            text={whatsAppText}
            onCopy={() => copyToClipboard(whatsAppText, 'Texto WhatsApp')}
            rows={4}
          />
          <Field
            id="share-twitter"
            label="X / Twitter"
            text={twitterText}
            onCopy={() => copyToClipboard(twitterText, 'Texto X/Twitter')}
            rows={3}
            hint={
              twitterText ? `${twitterText.length}/280 caracteres` : undefined
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  text,
  onCopy,
  rows,
  hint,
}: {
  id: string
  label: string
  text: string
  onCopy: () => void
  rows: number
  hint?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="font-medium text-foreground text-sm" htmlFor={id}>
          {label}
        </label>
        <button
          aria-label={`Copiar ${label}`}
          className={COPY_BUTTON_CLASS}
          disabled={!text}
          onClick={onCopy}
          type="button"
        >
          <Copy aria-hidden className="h-3 w-3" />
          Copiar
        </button>
      </div>
      <textarea
        className={TEXTAREA_CLASS}
        id={id}
        readOnly
        rows={rows}
        value={text}
      />
      {hint ? (
        <p className="mt-1 text-foreground-subtle text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
