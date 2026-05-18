'use client'

import { Share2 } from 'lucide-react'

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

/**
 * Botão "Compartilhar resumo" do PerfilHeader (Wave 7 Sprint 7.2 PR2).
 *
 * Stub do Dialog será expandido na Sprint 7.2 PR3 com:
 * - URL canônica do perfil
 * - Texto pré-formatado WhatsApp
 * - Texto pré-formatado X/Twitter (≤280 chars)
 * - Botão "Copiar link" (Clipboard API + toast via sonner)
 *
 * Por ora renderiza o trigger + dialog vazio para validar layout +
 * a11y do trigger no header, sem JS de share ainda. Não-functional
 * é honesto melhor que botão fake — usuário entende "feature em
 * construção" pelo conteúdo do dialog.
 */
export function CompartilharButton({ parlamentar }: Props) {
  const _cargo = parlamentar.casa === 'CAMARA' ? 'Deputado' : 'Senador'
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
          <DialogTitle>Compartilhar resumo</DialogTitle>
          <DialogDescription>
            Compartilhamento de {parlamentar.nome} ({parlamentar.partidoSigla}/
            {parlamentar.uf}) — em construção.
          </DialogDescription>
        </DialogHeader>
        <p className="text-foreground-muted text-sm">
          Os textos pré-formatados para WhatsApp e X/Twitter + botão "Copiar
          link" serão entregues na Sprint 7.2 PR3.
        </p>
      </DialogContent>
    </Dialog>
  )
}
