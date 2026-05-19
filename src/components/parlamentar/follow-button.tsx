'use client'

// Botão "Acompanhar / Acompanhando ✓" — Wave 10 Etapa 2.
//
// Estados:
//   - Anônimo (`isAnonymous=true`): renderiza como link para /sign-in,
//     preservando o intent ("após login, mande pra cá") via returnBackUrl
//     que o Clerk processa automaticamente
//   - Autenticado + não acompanhando: button "Acompanhar"
//   - Autenticado + acompanhando: button "Acompanhando ✓"
//   - Loading: button disabled
//   - Erro: toast (sonner) + revert do optimistic update
//
// Optimistic update: clica → state vira pro destino imediatamente →
// fetch em background → se falha, reverte + toast. UX responsiva para
// uma ação naturalmente "rápida e binária".

import { Check, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/design-system/primitives/button'

interface Props {
  parlamentarId: string
  initialIsFollowing: boolean
  /** Se `true`, o botão vira link para /sign-in (preserva intent). */
  isAnonymous: boolean
}

export function FollowButton({
  parlamentarId,
  initialIsFollowing,
  isAnonymous,
}: Props) {
  // Anônimo: link estático. Sem state, sem fetch.
  if (isAnonymous) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/sign-in">
          <Plus aria-hidden="true" />
          Acompanhar
        </Link>
      </Button>
    )
  }

  return (
    <AuthenticatedFollowButton
      initialIsFollowing={initialIsFollowing}
      parlamentarId={parlamentarId}
    />
  )
}

function AuthenticatedFollowButton({
  parlamentarId,
  initialIsFollowing,
}: {
  parlamentarId: string
  initialIsFollowing: boolean
}) {
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
          // Revert optimistic
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

  return (
    <Button
      aria-pressed={isFollowing}
      disabled={pending}
      onClick={handleClick}
      size="sm"
      variant={isFollowing ? 'secondary' : 'outline'}
    >
      {isFollowing ? (
        <>
          <Check aria-hidden="true" />
          Acompanhando
        </>
      ) : (
        <>
          <Plus aria-hidden="true" />
          Acompanhar
        </>
      )}
    </Button>
  )
}
