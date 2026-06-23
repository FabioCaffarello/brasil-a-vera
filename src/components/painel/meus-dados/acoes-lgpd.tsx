'use client'

// Ações LGPD (Exportar / Anonimizar / Eliminar) — Wave 10 Etapa 9.5.
//
// 3 botões abrindo 3 modais distintos. Cada ação chama uma das
// rotas da Etapa 9.4:
//   - Exportar:  POST /api/painel/dados/export    → Blob download
//   - Anonimizar: POST /api/painel/dados/anonimizar → signOut /
//   - Eliminar:   POST /api/painel/dados/erase     → signOut /
//
// Fricção UX por gravidade:
//   - Exportar: confirm simples (sem typing — ação reversível,
//     não afeta dados).
//   - Anonimizar e Eliminar: typing literal ("ANONIMIZAR" /
//     "ELIMINAR") na caixa de texto antes do botão habilitar.
//     Anonimizar é irreversível (PII apaga imediatamente);
//     Eliminar é reversível em 30 dias.
//
// Usa o Dialog do RDS controlado (`open`/`onOpenChange`) — fecha ao
// confirmar e abre um modal por vez (export/anonymize/eliminar).

import { useClerk } from '@clerk/nextjs'
import { Button } from '@fabio.caffarello/react-design-system/server'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/design-system/primitives/rds-dialog'
import { useToast } from '@/design-system/primitives/rds-toast'

type ActionKind = 'export' | 'anonymize' | 'erase' | null

const ANONIMIZAR_CONFIRM_WORD = 'ANONIMIZAR'
const ELIMINAR_CONFIRM_WORD = 'ELIMINAR'

export function AcoesLgpd() {
  const toast = useToast()
  const router = useRouter()
  const { signOut } = useClerk()
  const [open, setOpen] = useState<ActionKind>(null)
  const [confirmText, setConfirmText] = useState('')
  const [pending, setPending] = useState(false)

  function openModal(kind: Exclude<ActionKind, null>) {
    setOpen(kind)
    setConfirmText('')
  }

  function closeModal() {
    if (pending) return
    setOpen(null)
    setConfirmText('')
  }

  async function handleExport() {
    setPending(true)
    try {
      const res = await fetch('/api/painel/dados/export', { method: 'POST' })
      if (!res.ok) {
        toast.error('Não foi possível exportar. Tente novamente.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const today = new Date().toISOString().slice(0, 10)
      link.download = `brasil-a-vera-export-${today}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Export concluído.')
      setOpen(null)
      router.refresh()
    } catch {
      toast.error('Sem conexão. Tente novamente em instantes.')
    } finally {
      setPending(false)
    }
  }

  async function handleDestructive(kind: 'anonymize' | 'erase') {
    setPending(true)
    try {
      const path =
        kind === 'anonymize'
          ? '/api/painel/dados/anonimizar'
          : '/api/painel/dados/erase'
      const res = await fetch(path, { method: 'POST' })
      if (!res.ok) {
        toast.error('Não foi possível processar. Tente novamente.')
        setPending(false)
        return
      }
      // Server retorna { signOut: true } — encerra sessão Clerk e
      // leva o usuário para a home. router.refresh() não é
      // necessário porque o redirect efetivo é o signOut.
      await signOut({ redirectUrl: '/' })
    } catch {
      toast.error('Sem conexão. Tente novamente em instantes.')
      setPending(false)
    }
  }

  const confirmWordRequired =
    open === 'anonymize'
      ? ANONIMIZAR_CONFIRM_WORD
      : open === 'erase'
        ? ELIMINAR_CONFIRM_WORD
        : null

  const confirmEnabled =
    open === 'export'
      ? true
      : open === null
        ? false
        : confirmText === confirmWordRequired

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-line-default bg-surface-base p-4">
        <h3 className="font-medium text-fg-primary text-sm">
          Exportar seus dados
        </h3>
        <p className="mt-1 text-fg-tertiary text-xs">
          Recebe um arquivo JSON com tudo que registramos sobre você. LGPD art.
          18 V (portabilidade).
        </p>
        <Button
          className="mt-3"
          onClick={() => openModal('export')}
          size="sm"
          type="button"
          variant="outline"
        >
          Exportar JSON
        </Button>
      </div>

      <div className="rounded-md border border-line-default bg-surface-base p-4">
        <h3 className="font-medium text-fg-primary text-sm">
          Anonimizar sua conta
        </h3>
        <p className="mt-1 text-fg-tertiary text-xs">
          Apaga email, nome e qualquer identificador agora.{' '}
          <strong>Irreversível.</strong> Histórico cívico abstrato
          (consentimentos prestados, sem identificá-lo) é preservado para
          auditoria. LGPD art. 16 e art. 18 IV.
        </p>
        <Button
          className="mt-3"
          onClick={() => openModal('anonymize')}
          size="sm"
          type="button"
          variant="outline"
        >
          Anonimizar...
        </Button>
      </div>

      <div className="rounded-md border border-error/40 bg-error/5 p-4">
        <h3 className="font-medium text-fg-primary text-sm">
          Eliminar sua conta
        </h3>
        <p className="mt-1 text-fg-tertiary text-xs">
          Sua conta vai para o estado "eliminada" agora. Você pode reativar em
          até 30 dias acessando novamente; depois disso, eliminação definitiva.
          LGPD art. 18 VI.
        </p>
        <Button
          className="mt-3"
          onClick={() => openModal('erase')}
          size="sm"
          type="button"
          variant="outline"
        >
          Eliminar...
        </Button>
      </div>

      <Dialog onOpenChange={closeModal} open={open !== null}>
        {/* Dispensável (Esc/overlay/X fecham → closeModal); size lg. */}
        <DialogContent size="lg">
          <DialogTitle className="font-semibold text-fg-primary text-lg leading-none tracking-tight">
            {open === 'export'
              ? 'Exportar seus dados'
              : open === 'anonymize'
                ? 'Anonimizar sua conta'
                : 'Eliminar sua conta'}
          </DialogTitle>
          <DialogDescription className="space-y-3 text-fg-tertiary text-sm leading-relaxed">
            {open === 'export' && (
              <span className="block">
                Vamos preparar um arquivo JSON com todos os dados que
                registramos sobre você (perfil, parlamentares acompanhados,
                política de alertas, histórico de reports e consentimentos). O
                download começa automaticamente quando estiver pronto.
              </span>
            )}
            {open === 'anonymize' && (
              <>
                <span className="block">
                  A anonimização é <strong>imediata e irreversível</strong>.
                  Email, nome e identificadores associados a você serão apagados
                  agora. Você não conseguirá recuperar a conta — um novo login
                  criará um novo perfil em branco.
                </span>
                <span className="block">
                  Para confirmar, digite{' '}
                  <code className="font-mono text-fg-primary text-xs">
                    {ANONIMIZAR_CONFIRM_WORD}
                  </code>{' '}
                  no campo abaixo.
                </span>
              </>
            )}
            {open === 'erase' && (
              <>
                <span className="block">
                  Sua conta entra no estado eliminado agora. Você tem 30 dias
                  para voltar e reativar acessando normalmente; depois desse
                  prazo, eliminação definitiva.
                </span>
                <span className="block">
                  Para confirmar, digite{' '}
                  <code className="font-mono text-fg-primary text-xs">
                    {ELIMINAR_CONFIRM_WORD}
                  </code>{' '}
                  no campo abaixo.
                </span>
              </>
            )}
          </DialogDescription>

          {(open === 'anonymize' || open === 'erase') && (
            <input
              aria-label={
                open === 'anonymize'
                  ? `Digite ${ANONIMIZAR_CONFIRM_WORD} para confirmar`
                  : `Digite ${ELIMINAR_CONFIRM_WORD} para confirmar`
              }
              autoComplete="off"
              className="w-full rounded-md border border-line-default bg-surface-base px-3 py-2 font-mono text-fg-primary text-sm outline-none focus:border-fg-brand focus:ring-2 focus:ring-fg-brand/30"
              disabled={pending}
              onChange={(e) => setConfirmText(e.target.value)}
              type="text"
              value={confirmText}
            />
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              disabled={pending}
              onClick={closeModal}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={!confirmEnabled || pending}
              onClick={() => {
                if (open === 'export') return handleExport()
                if (open === 'anonymize') return handleDestructive('anonymize')
                if (open === 'erase') return handleDestructive('erase')
              }}
              type="button"
            >
              {pending
                ? 'Processando...'
                : open === 'export'
                  ? 'Confirmar export'
                  : open === 'anonymize'
                    ? 'Anonimizar agora'
                    : 'Eliminar agora'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
