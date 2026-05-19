'use client'

// Form Perfil — Wave 10 Etapa 5.
//
// Campos:
//   - Nome (editável) — atualiza Clerk + user_profile.display_name
//   - E-mail (read-only) — gerenciado pelo Clerk Account Portal
//   - UF (select) — atualiza user_profile.uf
//
// PATCH /api/painel/profile só envia campos que mudaram (dirty fields).

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/design-system/primitives/button'
import { UFS, type Uf } from '@/lib/municipios'

interface Props {
  initialDisplayName: string | null
  email: string
  initialUf: string | null
}

export function FormPerfil({ initialDisplayName, email, initialUf }: Props) {
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
          className="block font-medium text-foreground text-sm"
          htmlFor="form-perfil-nome"
        >
          Nome
        </label>
        <input
          className="mt-1 block w-full rounded-md border border-border-strong bg-background px-3 py-2 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="block font-medium text-foreground text-sm"
          htmlFor="form-perfil-email"
        >
          E-mail
        </label>
        <input
          className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground-muted text-sm"
          disabled
          id="form-perfil-email"
          readOnly
          type="email"
          value={email}
        />
        <p className="mt-1 text-foreground-subtle text-xs">
          Para alterar e-mail, acesse o gerenciador da sua conta de auth.
        </p>
      </div>

      <div>
        <label
          className="block font-medium text-foreground text-sm"
          htmlFor="form-perfil-uf"
        >
          UF
        </label>
        <select
          className="mt-1 block w-full rounded-md border border-border-strong bg-background px-3 py-2 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
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
