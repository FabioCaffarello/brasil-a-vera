// PainelHeader — Fase 3 do refator do painel pós-Wave 10 (RFC §5).
//
// Header de identificação contextual do usuário logado. Vive em
// `painel/layout.tsx` (acima do TabBar). Server Component puro
// (zero JS); recebe identidade já resolvida pelo layout.
//
// Proposta B do wireframing: avatar gradient (mesma identidade visual
// do logo da Navbar, Hotfix 10.3) + kicker "SUA ÁREA" + nome + email · UF.
// Background `bg-surface-elevated` + border-bottom para separar do TabBar.

import { cn } from '@/lib/cn'

interface Props {
  displayName: string | null
  email: string
  uf: string | null
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
    return (
      (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
    ).toUpperCase()
  }
  // Fallback: primeira letra do email (pré-@)
  return email[0]?.toUpperCase() ?? '?'
}

export function PainelHeader({ displayName, email, uf }: Props) {
  const initials = getInitials(displayName, email)

  return (
    <header
      className={cn(
        'border-border border-b bg-surface-elevated',
        'mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4',
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-semibold text-sm text-white ring-1 ring-white/10"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground-muted text-xs uppercase tracking-wider">
          Sua área
        </p>
        <p className="truncate font-medium text-foreground">
          {displayName ?? email.split('@')[0]}
        </p>
        <p className="truncate text-foreground-muted text-xs">
          <span>{email}</span>
          {uf ? <span className="ml-2">· {uf}</span> : null}
        </p>
      </div>
    </header>
  )
}
