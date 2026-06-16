'use client'

// Chips de temas de interesse — Wave 10 Etapa 5.
//
// 8 chips toggle. Persistência via POST /api/painel/profile/themes
// (replace inteiro). Disparo é manual ("Salvar temas") para evitar
// PATCH por toggle individual. UI espelha a do wizard de onboarding
// passo 2 (intencional — usuário reconhece o componente).

import { Button } from '@fabio.caffarello/react-design-system/server'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useToast } from '@/design-system/primitives/rds-toast'
import { cn } from '@/lib/cn'
import { TEMAS, type TemaId } from '@/lib/constants/temas'

interface Props {
  initialThemes: string[]
}

export function TemasChips({ initialThemes }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [themes, setThemes] = useState<TemaId[]>(
    initialThemes.filter((t): t is TemaId =>
      (TEMAS.map((x) => x.id) as readonly string[]).includes(t),
    ),
  )
  const [pending, startTransition] = useTransition()

  const dirty = !setsEqual(initialThemes, themes)

  function toggle(id: TemaId) {
    setThemes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  function submit() {
    if (!dirty) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/painel/profile/themes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ themes }),
        })
        if (!res.ok) {
          toast.error('Não foi possível salvar os temas. Tente novamente.')
          return
        }
        toast.success('Temas atualizados.')
        router.refresh()
      } catch {
        toast.error('Sem conexão. Tente de novo em instantes.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TEMAS.map((tema) => {
          const selected = themes.includes(tema.id)
          return (
            <button
              aria-pressed={selected}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                selected
                  ? 'border-fg-brand bg-fg-brand/10 text-fg-primary'
                  : 'border-line-default bg-surface-canvas text-fg-tertiary hover:border-line-emphasis hover:text-fg-primary',
              )}
              disabled={pending}
              key={tema.id}
              onClick={() => toggle(tema.id)}
              type="button"
            >
              {tema.label}
            </button>
          )
        })}
      </div>
      <Button disabled={pending || !dirty} onClick={submit} type="button">
        Salvar temas
      </Button>
    </div>
  )
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  return b.every((x) => setA.has(x))
}
