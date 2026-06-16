'use client'

// Modal defensivo de migração localStorage → follows — Wave 10 Etapa 9.7.
//
// **Decisão consciente (ADR-019)**: este componente é defensivo. O
// codebase produtivo NUNCA gravou em `localStorage` para
// parlamentares favoritos (busca completa no histórico do repo
// confirma); a chave `bav.parlamentares.favoritos` representa um
// hipotético state de pré-Wave 10 que pode existir em browsers de
// usuários que aterrissaram em versões antigas de feature branches.
// Em produção real, o componente é no-op (LS vazio → renderiza
// `null`). Aceitamos o hedge porque o custo é mínimo e a UX de
// "perdi meus favoritos" seria pior que um modal eventual.
//
// Comportamento:
//   - Mount client-side, lê localStorage uma vez via useEffect.
//   - Se chave ausente ou JSON malformado: silent no-op.
//   - Se chave presente com array de UUIDs: renderiza modal.
//   - 3 ações:
//     - Migrar: loop POST /api/painel/follows para cada UUID;
//       após sucesso, limpa LS. Erros parciais toast.warn.
//     - Ignorar: limpa LS sem chamar API (usuário descarta legado).
//     - Depois: fecha modal sem limpar LS (próxima visita pergunta
//       de novo).

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/design-system/primitives/button'
import { cn } from '@/lib/cn'

const LS_KEY = 'bav.parlamentares.favoritos'

// Zod schema defensivo: aceita array de strings UUID. Se o
// localStorage tiver schema diferente (objeto, números, etc.),
// `safeParse` falha e tratamos como malformado.
const legacySchema = z.array(z.string().uuid()).min(1).max(500)

type ModalState = 'idle' | 'open' | 'migrating' | 'done'

export function MigracaoLocalStorageModal() {
  const router = useRouter()
  const [state, setState] = useState<ModalState>('idle')
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    // Só roda client-side (componente é 'use client') — typeof check
    // por segurança caso o componente seja renderizado em SSR via
    // alguma topologia futura.
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      // JSON malformado: silent no-op (não removemos a chave — o
      // usuário pode ter algo que ele quer recuperar manualmente).
      return
    }

    const result = legacySchema.safeParse(parsed)
    if (!result.success) {
      // Schema não bate: silent no-op.
      return
    }

    setIds(result.data)
    setState('open')
  }, [])

  async function handleMigrate() {
    setState('migrating')
    let succeeded = 0
    let failed = 0
    for (const id of ids) {
      try {
        const res = await fetch('/api/painel/follows', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parlamentarId: id }),
        })
        if (res.ok) succeeded += 1
        else failed += 1
      } catch {
        failed += 1
      }
    }
    window.localStorage.removeItem(LS_KEY)

    if (failed === 0) {
      toast.success(`${succeeded} parlamentar(es) migrado(s) com sucesso.`)
    } else if (succeeded === 0) {
      toast.error('Não foi possível migrar — tente acompanhar manualmente.')
    } else {
      toast.warning(
        `${succeeded} migrado(s), ${failed} não puderam ser adicionados.`,
      )
    }
    setState('done')
    router.refresh()
  }

  function handleIgnore() {
    window.localStorage.removeItem(LS_KEY)
    setState('done')
  }

  function handleLater() {
    setState('done')
  }

  if (state === 'idle' || state === 'done') return null

  const pending = state === 'migrating'

  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4',
            'border border-line-default bg-surface-canvas p-6 shadow-lg sm:rounded-lg',
          )}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="font-semibold text-fg-primary text-lg leading-none tracking-tight">
            Migrar favoritos antigos?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="space-y-3 text-fg-tertiary text-sm leading-relaxed">
            <span className="block">
              Encontramos <strong>{ids.length}</strong> parlamentar(es) salvos
              no seu navegador de versões anteriores do Brasil à Vera. Você pode
              importá-los para sua conta agora — eles passam a aparecer em{' '}
              <strong>Parlamentares acompanhados</strong>.
            </span>
            <span className="block">
              Se ignorar, removemos esse registro local (não dá pra desfazer).
              Se preferir decidir depois, este aviso volta no próximo acesso.
            </span>
          </DialogPrimitive.Description>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              disabled={pending}
              onClick={handleLater}
              type="button"
              variant="outline"
            >
              Depois
            </Button>
            <Button
              disabled={pending}
              onClick={handleIgnore}
              type="button"
              variant="outline"
            >
              Ignorar
            </Button>
            <Button disabled={pending} onClick={handleMigrate} type="button">
              {pending ? 'Migrando...' : `Migrar ${ids.length}`}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
