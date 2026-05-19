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
// Implementação: uso direto dos primitives do Radix (não o
// `<DialogContent>` do nosso DS) porque ele renderiza um botão de
// fechar fixo no canto, e queremos modal não-fechável.

import { useClerk } from '@clerk/nextjs'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/design-system/primitives/button'
import { cn } from '@/lib/cn'

interface Props {
  policyVersion: string
}

export function ConsentModal({ policyVersion }: Props) {
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
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4',
            'border border-border bg-background p-6 shadow-lg sm:rounded-lg',
          )}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="font-semibold text-foreground text-lg leading-none tracking-tight">
            Atualizamos nossa Política de Privacidade
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="space-y-3 text-foreground-muted text-sm leading-relaxed">
            <span className="block">
              Para continuar usando o Brasil à Vera, precisamos do seu aceite à
              versão vigente da política. Você pode ler o texto completo antes
              de decidir.
            </span>
            <span className="block">
              <a
                className="text-brand underline underline-offset-2 transition-colors duration-150 hover:text-brand/80"
                href="/privacidade"
                rel="noopener noreferrer"
                target="_blank"
              >
                Abrir política de privacidade
              </a>{' '}
              <span className="text-foreground-muted text-xs">
                (versão {policyVersion} · abre em nova aba)
              </span>
            </span>
          </DialogPrimitive.Description>
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
