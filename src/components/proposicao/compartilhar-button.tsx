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
  proposicao: {
    /** Referência canônica formatada (ex: "PL 1234/2025"). */
    ref: string
    /** Ementa para o texto pré-formatado — truncada a 120 chars para
     * não inflar mensagens de WhatsApp/X. */
    ementa: string
    /** Dias em tramitação (vem do agregado). Null se proposição sem
     * tramitação registrada — texto cai em fallback sem o "Tramitando há N". */
    diasEmTramitacao: number | null
    /** Número de autores (vem do agregado). Null se proposição sem autoria
     * cadastrada — texto cai em fallback sem "N autores". */
    nAutores: number | null
  }
}

const TEXTAREA_CLASS =
  'block min-h-[6rem] w-full resize-none rounded-md border border-border-strong bg-background px-3 py-2 font-mono text-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const COPY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-background px-2.5 py-1.5 font-medium text-foreground text-xs hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const EMENTA_MAX = 120

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

// Fragmento de stats: omite quando o agregado não tem dado (P2).
// Não inventa "0 autores" para proposição sem autoria registrada.
function buildStatsLine(
  diasEmTramitacao: number | null,
  nAutores: number | null,
): string {
  const partes: string[] = []
  if (typeof diasEmTramitacao === 'number' && diasEmTramitacao > 0) {
    partes.push(
      `Tramitando há ${diasEmTramitacao} ${diasEmTramitacao === 1 ? 'dia' : 'dias'}`,
    )
  }
  if (typeof nAutores === 'number' && nAutores > 0) {
    partes.push(`${nAutores} ${nAutores === 1 ? 'autor' : 'autores'}`)
  }
  return partes.join('. ')
}

function buildWhatsApp(proposicao: Props['proposicao'], url: string): string {
  const ementaCurta = truncate(proposicao.ementa, EMENTA_MAX)
  const stats = buildStatsLine(proposicao.diasEmTramitacao, proposicao.nAutores)
  const statsLine = stats ? `\n${stats}.` : ''
  return `📜 ${proposicao.ref} — ${ementaCurta}${statsLine}\n\nVer: ${url}`
}

function buildTwitter(proposicao: Props['proposicao'], url: string): string {
  // Twitter conta URL como 23 chars. Reservamos ~257 chars para texto.
  // Tentativa 1: ref + ementa truncada + url. Se exceder, comprime.
  const ementaCurta = truncate(proposicao.ementa, EMENTA_MAX)
  const base = `📜 ${proposicao.ref} — ${ementaCurta}\n\n${url}`
  if (base.length <= 280) return base
  // Fallback compacto: ementa mais curta ainda
  const ementaCompacta = truncate(proposicao.ementa, 60)
  return `📜 ${proposicao.ref} — ${ementaCompacta}\n\n${url}`
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
 * Botão "Compartilhar" do PerfilProposicaoHeader (Wave 8 Sprint 8.2 PR2).
 *
 * Dialog completo espelhando o padrão estabelecido pelo CompartilharButton
 * do parlamentar (Wave 7 Sprint 7.2 PR3). PR3 do plano original
 * (Dialog Compartilhar) foi absorvido neste PR2: separar trigger e dialog
 * em PRs distintos cria fragmentação sem ganho (Wave 7 fez tudo num PR).
 *
 * Conteúdo:
 * - URL canônica da página (window.location.href, resolved post-mount)
 * - Texto WhatsApp pré-formatado (ementa truncada 120ch + stats opcionais)
 * - Texto X/Twitter ≤ 280 chars com fallback compacto
 * - 3 botões "Copiar" via Clipboard API + toast sonner
 *
 * Sem instrumentação de eventos — aceita "sem dado de uso até Wave 9".
 */
export function CompartilharProposicaoButton({ proposicao }: Props) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const whatsAppText = url ? buildWhatsApp(proposicao, url) : ''
  const twitterText = url ? buildTwitter(proposicao, url) : ''

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-background px-3 py-2 font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="button"
        >
          <Share2 aria-hidden className="h-4 w-4" />
          Compartilhar
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar proposição</DialogTitle>
          <DialogDescription>
            {proposicao.ref} — copie o link ou um texto pré-formatado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            id="share-prop-url"
            label="Link"
            onCopy={() => copyToClipboard(url, 'Link')}
            rows={1}
            text={url}
          />
          <Field
            id="share-prop-whatsapp"
            label="WhatsApp"
            onCopy={() => copyToClipboard(whatsAppText, 'Texto WhatsApp')}
            rows={5}
            text={whatsAppText}
          />
          <Field
            hint={
              twitterText ? `${twitterText.length}/280 caracteres` : undefined
            }
            id="share-prop-twitter"
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
