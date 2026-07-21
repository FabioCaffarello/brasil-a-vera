// Seletor de parlamentares do /comparar — auditoria UX 2026-07-20 (P1.6):
// o estado vazio instruía o cidadão a montar a URL à mão com UUIDs
// (`/comparar?ids=<uuid1>,<uuid2>`). Form GET zero-JS: três <select> com o
// mesmo name="ids" viram `?ids=a&ids=b(&ids=c)`, que o parseIds da page já
// aceita (array join). Opções vêm do fetch-all cacheado da listagem.

import { Button, Label } from '@fabio.caffarello/react-design-system/server'
import type { ParlamentarListRow } from '@/lib/queries/parlamentares'

interface Props {
  parlamentares: ParlamentarListRow[]
  /** IDs pré-selecionados (ex.: usuário chegou com 1 ID válido na URL). */
  selecionados?: string[]
}

const SELECT_CLASS =
  'min-h-[44px] w-full rounded-md border border-line-emphasis bg-surface-canvas px-2 py-1.5 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

const SLOTS = [
  { id: 'comparar-p1', label: 'Parlamentar 1', obrigatorio: true },
  { id: 'comparar-p2', label: 'Parlamentar 2', obrigatorio: true },
  { id: 'comparar-p3', label: 'Parlamentar 3 (opcional)', obrigatorio: false },
] as const

export function SeletorComparacao({ parlamentares, selecionados = [] }: Props) {
  return (
    <form action="/comparar" className="space-y-4" method="get">
      <div className="grid gap-4 sm:grid-cols-3">
        {SLOTS.map((slot, i) => (
          <div className="flex flex-col gap-1" key={slot.id}>
            <Label className="text-fg-tertiary text-xs" htmlFor={slot.id}>
              {slot.label}
            </Label>
            <select
              className={SELECT_CLASS}
              defaultValue={selecionados[i] ?? ''}
              id={slot.id}
              name="ids"
              required={slot.obrigatorio}
            >
              <option value="">Selecione…</option>
              {parlamentares.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.partidoSigla ?? '—'}/{p.uf})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Button size="sm" type="submit">
        Comparar
      </Button>
    </form>
  )
}
