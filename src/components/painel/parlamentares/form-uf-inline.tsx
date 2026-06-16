'use client'

// Form inline de UF — Wave 10 Etapa 4.
//
// Usado pelo empty state da sub-tab "Da minha UF" quando o usuário pulou
// a UF no wizard. Submete para POST /api/painel/profile/uf e dá refresh
// no router para a página re-renderizar com a UF nova.

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/design-system/primitives/button'
import { UFS, type Uf } from '@/lib/municipios'

export function FormUfInline() {
  const router = useRouter()
  const [uf, setUf] = useState<Uf | ''>('')
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!uf) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/painel/profile/uf', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ uf }),
        })
        if (!res.ok) {
          toast.error('Não foi possível salvar. Tente novamente.')
          return
        }
        router.refresh()
      } catch {
        toast.error('Sem conexão. Tente de novo em instantes.')
      }
    })
  }

  return (
    <form
      className="flex flex-col items-start gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="w-full sm:w-48">
        <label
          className="block font-medium text-fg-primary text-sm"
          htmlFor="form-uf-inline"
        >
          Sua UF
        </label>
        <select
          className="mt-1 block w-full rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
          disabled={pending}
          id="form-uf-inline"
          onChange={(e) => setUf(e.target.value as Uf | '')}
          value={uf}
        >
          <option value="">Selecione…</option>
          {UFS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <Button disabled={pending || !uf} type="submit">
        Salvar UF
      </Button>
    </form>
  )
}
