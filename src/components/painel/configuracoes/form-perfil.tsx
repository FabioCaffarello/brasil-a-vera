'use client'

// Form Perfil — Wave 10 Etapa 5.
//
// Campos:
//   - Nome (editável) — atualiza Clerk + user_profile.display_name
//   - E-mail (read-only) — gerenciado pelo Clerk Account Portal
//   - UF (select) — atualiza user_profile.uf
//
// PATCH /api/painel/profile só envia campos que mudaram (dirty fields).

import { Button } from '@fabio.caffarello/react-design-system/server'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useToast } from '@/design-system/primitives/rds-toast'
import { UFS, type Uf } from '@/lib/municipios'

interface Props {
  initialDisplayName: string | null
  email: string
  initialUf: string | null
}

export function FormPerfil({ initialDisplayName, email, initialUf }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [uf, setUf] = useState<Uf | ''>((initialUf ?? '') as Uf | '')
  const [pending, startTransition] = useTransition()

  const trimmedName = displayName.trim()
  const dirtyName = trimmedName !== (initialDisplayName?.trim() ?? '')
  const dirtyUf = (uf || null) !== (initialUf || null)
  const dirty = dirtyName || dirtyUf

  function submit() {
    if (!dirty) return
    startTransition(async () => {
      const body: { displayName?: string | null; uf?: string | null } = {}
      if (dirtyName) body.displayName = trimmedName || null
      if (dirtyUf) body.uf = uf || null
      try {
        const res = await fetch('/api/painel/profile', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          toast.error('Não foi possível salvar o perfil. Tente novamente.')
          return
        }
        toast.success('Perfil atualizado.')
        router.refresh()
      } catch {
        toast.error('Sem conexão. Tente de novo em instantes.')
      }
    })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div>
        <label
          className="block font-medium text-fg-primary text-sm"
          htmlFor="form-perfil-nome"
        >
          Nome
        </label>
        <input
          className="mt-1 block w-full rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
          disabled={pending}
          id="form-perfil-nome"
          maxLength={120}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Como prefere ser chamado"
          type="text"
          value={displayName}
        />
      </div>

      <div>
        <label
          className="block font-medium text-fg-primary text-sm"
          htmlFor="form-perfil-email"
        >
          E-mail
        </label>
        <input
          className="mt-1 block w-full rounded-md border border-line-default bg-surface-base px-3 py-2 text-fg-tertiary text-sm"
          disabled
          id="form-perfil-email"
          readOnly
          type="email"
          value={email}
        />
        <p className="mt-1 text-fg-quaternary text-xs">
          Para alterar e-mail, acesse o gerenciador da sua conta de auth.
        </p>
      </div>

      <div>
        <label
          className="block font-medium text-fg-primary text-sm"
          htmlFor="form-perfil-uf"
        >
          UF
        </label>
        <select
          className="mt-1 block w-full rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus sm:w-48"
          disabled={pending}
          id="form-perfil-uf"
          onChange={(e) => setUf(e.target.value as Uf | '')}
          value={uf}
        >
          <option value="">Não preencher</option>
          {UFS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <Button disabled={pending || !dirty} type="submit">
        Salvar perfil
      </Button>
    </form>
  )
}
