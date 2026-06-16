'use client'

// Modal de revisão de UF antiga — Wave 10 Etapa 4.
//
// LOGGED-AREA-VISION §5.2 Ajuste 2: quando o usuário muda de UF, mostra
// banner "seus N acompanhados anteriores continuam — revisar?" que abre
// este modal. Lista os acompanhados fora da nova UF; checkboxes default
// unchecked (preserva intenção); botões "Desacompanhar selecionados (N)"
// e "Manter todos".
//
// Batch DELETE via /api/painel/follows com body { parlamentarIds: [] }.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/design-system/primitives/dialog'

interface FollowForeignToUf {
  id: string
  nome: string
  partidoSigla: string
  uf: string
  urlFoto: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  newUf: string
  followsForeign: FollowForeignToUf[]
}

export function ModalRevisarUfAntiga({
  open,
  onOpenChange,
  newUf,
  followsForeign,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function manterTodos() {
    onOpenChange(false)
  }

  function desacompanharSelecionados() {
    if (selected.size === 0) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/painel/follows', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ parlamentarIds: Array.from(selected) }),
        })
        if (!res.ok) {
          toast.error('Não foi possível desacompanhar. Tente novamente.')
          return
        }
        toast.success(
          `${selected.size} ${selected.size === 1 ? 'parlamentar' : 'parlamentares'} removido(s) dos seus acompanhados.`,
        )
        onOpenChange(false)
        router.refresh()
      } catch {
        toast.error('Sem conexão. Tente de novo em instantes.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Revisar acompanhados de outras UFs</DialogTitle>
          <DialogDescription>
            Você mudou para {newUf}. Seus parlamentares acompanhados de outras
            UFs continuam ativos por padrão. Selecione os que quiser remover ou
            mantenha todos.
          </DialogDescription>
        </DialogHeader>

        <ul className="my-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {followsForeign.map((p) => {
            const isSelected = selected.has(p.id)
            return (
              <li key={p.id}>
                <label
                  className="flex items-center gap-3 rounded-md border border-line-default bg-surface-base p-3 transition-colors hover:border-line-emphasis has-[input:checked]:border-error has-[input:checked]:bg-destructive/5"
                  htmlFor={`revisar-${p.id}`}
                >
                  <input
                    checked={isSelected}
                    className="size-4 accent-destructive"
                    id={`revisar-${p.id}`}
                    onChange={() => toggle(p.id)}
                    type="checkbox"
                  />
                  {p.urlFoto ? (
                    // biome-ignore lint/performance/noImgElement: foto remota; dimensões explícitas.
                    <img
                      alt=""
                      className="size-10 shrink-0 rounded-full object-cover"
                      height={40}
                      loading="lazy"
                      src={p.urlFoto}
                      width={40}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-10 shrink-0 rounded-full bg-surface-raised"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg-primary text-sm">
                      {p.nome}
                    </p>
                    <p className="text-fg-tertiary text-xs">
                      {p.partidoSigla} · {p.uf}
                    </p>
                  </div>
                </label>
              </li>
            )
          })}
        </ul>

        <footer className="flex items-center justify-between gap-2 border-line-emphasis border-t pt-4">
          <Button
            disabled={pending}
            onClick={manterTodos}
            type="button"
            variant="ghost"
          >
            Manter todos
          </Button>
          <Button
            disabled={pending || selected.size === 0}
            onClick={desacompanharSelecionados}
            type="button"
            variant="error"
          >
            Desacompanhar selecionados ({selected.size})
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
