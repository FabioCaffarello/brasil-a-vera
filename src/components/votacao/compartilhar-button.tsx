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
} from '@/design-system/primitives/rds-dialog'

interface Props {
  votacao: {
    descricao: string
    aprovada: boolean
    votosSim: number
    votosNao: number
    casa: 'CAMARA' | 'SENADO'
  }
}

const TEXTAREA_CLASS =
  'block min-h-[6rem] w-full resize-none rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-mono text-fg-primary text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

const COPY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border border-line-emphasis bg-surface-canvas px-2.5 py-1.5 font-medium text-fg-primary text-xs hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

const DESCRICAO_MAX_WHATSAPP = 120
const DESCRICAO_MAX_TWITTER = 100
const DESCRICAO_MAX_TWITTER_FALLBACK = 60

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function casaLabel(casa: 'CAMARA' | 'SENADO'): string {
  return casa === 'CAMARA' ? 'Câmara' : 'Senado'
}

function resultadoLine(v: Props['votacao']): string {
  const resultado = v.aprovada ? 'Aprovada' : 'Rejeitada'
  return `${resultado} por ${v.votosSim} a ${v.votosNao} (${casaLabel(v.casa)})`
}

function buildWhatsApp(v: Props['votacao'], url: string): string {
  const descCurta = truncate(v.descricao, DESCRICAO_MAX_WHATSAPP)
  return `🗳️ ${descCurta}\n${resultadoLine(v)}.\n\nVer: ${url}`
}

function buildTwitter(v: Props['votacao'], url: string): string {
  // Twitter conta URL como 23 chars. Tentativa 1: descrição truncada 100 +
  // resultado + URL. Fallback compacto se exceder 280.
  const linha = resultadoLine(v)
  const base = `🗳️ ${truncate(v.descricao, DESCRICAO_MAX_TWITTER)}\n${linha}\n\n${url}`
  if (base.length <= 280) return base
  return `🗳️ ${truncate(v.descricao, DESCRICAO_MAX_TWITTER_FALLBACK)}\n${linha}\n\n${url}`
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
 * Botão "Compartilhar" do PerfilVotacaoHeader (Wave 9 Sprint 9.2 PR3).
 *
 * Espelha exatamente CompartilharProposicaoButton (Wave 8 Sprint 8.2 PR2).
 * Mesmo Dialog, mesma estrutura de 3 Fields, mesma toast API. Diferença
 * está só nos templates de texto — adaptados para narrativa de votação
 * (resultado + margem + casa).
 *
 * Templates honestos: descrição truncada com elipse Unicode, votos
 * mostrados como "X a Y" para destacar margem da decisão.
 */
export function CompartilharVotacaoButton({ votacao }: Props) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const whatsAppText = url ? buildWhatsApp(votacao, url) : ''
  const twitterText = url ? buildTwitter(votacao, url) : ''

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          type="button"
        >
          <Share2 aria-hidden className="h-4 w-4" />
          Compartilhar
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar votação</DialogTitle>
          <DialogDescription>
            Copie o link ou um texto pré-formatado para WhatsApp ou X.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            id="share-vot-url"
            label="Link"
            onCopy={() => copyToClipboard(url, 'Link')}
            rows={1}
            text={url}
          />
          <Field
            id="share-vot-whatsapp"
            label="WhatsApp"
            onCopy={() => copyToClipboard(whatsAppText, 'Texto WhatsApp')}
            rows={5}
            text={whatsAppText}
          />
          <Field
            hint={
              twitterText ? `${twitterText.length}/280 caracteres` : undefined
            }
            id="share-vot-twitter"
            label="X / Twitter"
            onCopy={() => copyToClipboard(twitterText, 'Texto X/Twitter')}
            rows={4}
            text={twitterText}
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
        <label className="font-medium text-fg-primary text-sm" htmlFor={id}>
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
      {hint ? <p className="mt-1 text-fg-quaternary text-xs">{hint}</p> : null}
    </div>
  )
}
