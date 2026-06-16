'use client'

// Modal de re-aceite da política de privacidade — Wave 10 Etapa 9.3.
//
// Renderizado pelo `<ConsentGate />` quando o usuário (a) nunca
// aceitou, (b) revogou consent, ou (c) aceitou versão diferente da
// vigente. Bloqueia interação com o resto do app: Esc não fecha,
// click fora não fecha, sem botão X.
//
// 2 ações: "Aceitar" (POST endpoint + router.refresh) e "Sair"
// (Clerk signOut → home). Link para `/privacidade` abre em nova
// aba (não tira o usuário do modal).
//
// Implementação: Dialog do RDS com closeOnEscape/closeOnOverlayClick/
// showCloseButton={false} (#221) — modal não-fechável sem precisar do
// Radix direto (ADR-038).

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

interface Props {
  policyVersion: string
}

export function ConsentModal({ policyVersion }: Props) {
  const toast = useToast()
  const router = useRouter()
  const { signOut } = useClerk()
  const [pendingAction, setPendingAction] = useState<'accept' | 'leave' | null>(
    null,
  )

  async function handleAccept() {
    if (pendingAction !== null) return
    setPendingAction('accept')
    try {
      const res = await fetch('/api/painel/consent/privacy-policy', {
        method: 'POST',
      })
      if (!res.ok) {
        toast.error('Não foi possível registrar o aceite. Tente novamente.')
        setPendingAction(null)
        return
      }
      // Refresh: o gate vai re-rodar a query e desbloquear o app.
      router.refresh()
    } catch {
      toast.error('Sem conexão. Tente novamente em instantes.')
      setPendingAction(null)
    }
  }

  async function handleLeave() {
    if (pendingAction !== null) return
    setPendingAction('leave')
    try {
      await signOut({ redirectUrl: '/' })
    } catch {
      // signOut do Clerk dificilmente falha; se cair aqui o usuário
      // ficou em estado estranho, mas o modal continua bloqueando.
      toast.error('Não foi possível sair. Recarregue a página.')
      setPendingAction(null)
    }
  }

  return (
    <Dialog open>
      {/* Consentimento LGPD — não-dispensável: sem Esc/click-outside/X.
          showCloseButton do RDS (#221) substitui o Radix-direto. */}
      <DialogContent
        closeOnEscape={false}
        closeOnOverlayClick={false}
        showCloseButton={false}
        size="lg"
      >
        <DialogTitle className="font-semibold text-fg-primary text-lg leading-none tracking-tight">
          Atualizamos nossa Política de Privacidade
        </DialogTitle>
        <DialogDescription className="space-y-3 text-fg-tertiary text-sm leading-relaxed">
          <span className="block">
            Para continuar usando o Brasil à Vera, precisamos do seu aceite à
            versão vigente da política. Você pode ler o texto completo antes de
            decidir.
          </span>
          <span className="block">
            <a
              className="text-fg-brand underline underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80"
              href="/privacidade"
              rel="noopener noreferrer"
              target="_blank"
            >
              Abrir política de privacidade
            </a>{' '}
            <span className="text-fg-tertiary text-xs">
              (versão {policyVersion} · abre em nova aba)
            </span>
          </span>
        </DialogDescription>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            disabled={pendingAction !== null}
            onClick={handleLeave}
            type="button"
            variant="outline"
          >
            {pendingAction === 'leave' ? 'Saindo...' : 'Sair'}
          </Button>
          <Button
            disabled={pendingAction !== null}
            onClick={handleAccept}
            type="button"
          >
            {pendingAction === 'accept' ? 'Registrando...' : 'Aceitar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
