'use client'

// Botão "Acompanhar / Deixar de acompanhar" — Wave 10 Hotfix 10.1.
//
// Redesign:
//   - Icon-only (Bell / BellRing) com aria-label dinâmico e title nativo
//   - Variant ghost, h-11 w-11 (44×44 touch target WCAG 2.5.5)
//   - Estado ativo combina forma de ícone + cor + preenchimento (3 dimensões
//     de diferenciação visual — acessibilidade para daltonismo)
//   - Sem branch anônimo: gating é server-side na page (anônimo não renderiza
//     o footer-action). FollowButton só existe para usuários autenticados.
//
// Optimistic update: clica → state vira pro destino imediatamente →
// fetch em background → se falha, reverte + toast. Mesmo padrão pré-Hotfix.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { Bell, BellRing } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useToast } from '@/design-system/primitives/rds-toast'
import { cn } from '@/lib/cn'

interface Props {
  parlamentarId: string
  parlamentarNome: string
  initialIsFollowing: boolean
}

export function FollowButton({
  parlamentarId,
  parlamentarNome,
  initialIsFollowing,
}: Props) {
  const toast = useToast()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const next = !isFollowing
    setIsFollowing(next) // optimistic
    startTransition(async () => {
      try {
        const res = await fetch('/api/painel/follows', {
          method: next ? 'POST' : 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parlamentarId }),
        })
        if (!res.ok) {
          setIsFollowing(!next)
          const body = (await res.json().catch(() => ({}))) as {
            error?: string
            cap?: number
          }
          if (body.error === 'cap_exceeded') {
            toast.error(
              `Limite atingido: você só pode acompanhar até ${body.cap ?? 200} parlamentares.`,
            )
          } else {
            toast.error('Não foi possível salvar. Tente novamente.')
          }
        }
      } catch {
        setIsFollowing(!next)
        toast.error('Sem conexão. Verifique sua internet e tente de novo.')
      }
    })
  }

  const label = isFollowing
    ? `Deixar de acompanhar ${parlamentarNome}`
    : `Acompanhar ${parlamentarNome}`

  return (
    <Button
      aria-label={label}
      aria-pressed={isFollowing}
      className={cn(
        'size-11 p-0',
        isFollowing
          ? 'text-fg-brand hover:text-fg-brand'
          : 'text-fg-quaternary hover:text-fg-primary',
      )}
      disabled={pending}
      onClick={handleClick}
      title={label}
      variant="ghost"
    >
      {isFollowing ? (
        <BellRing aria-hidden="true" fill="currentColor" fillOpacity={0.15} />
      ) : (
        <Bell aria-hidden="true" />
      )}
    </Button>
  )
}
