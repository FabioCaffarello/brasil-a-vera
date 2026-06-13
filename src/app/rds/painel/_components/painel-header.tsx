// Cópia-rds de src/components/painel/painel-header.tsx — migração painel
// (área logada /rds/painel). Server Component puro (zero JS).
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   border-border       → border-line-default
//   bg-surface-elevated → bg-surface-raised
//   text-foreground     → text-fg-primary
//   text-foreground-muted → text-fg-tertiary
//
// Tokens MANTIDOS (não traduzidos — decisão de classe CONHECIDA):
//   - `bg-gradient-primary`: utility custom do BaV (globals.css §313,
//     `linear-gradient(135deg, var(--primary), var(--accent))`). Compõe o
//     `--accent` roxo de data-viz (ADR-024), que NÃO tem par no RDS — mesmo
//     regime do resíduo `bg-accent/N` mantido na §3.14 (parlamentar-card):
//     token do projeto, destino final, não pendência da migração. Regra 2
//     (data-viz custom) avaliada e NÃO disparada: é uma utility de gradiente
//     ESTÁTICO de marca (avatar), não SVG/chart/`hsl(var())`/`color-mix` em
//     prop de chart. Calibra na promoção junto com o `--accent`.
//   - `text-white`, `ring-white/10`: utilities Tailwind PADRÃO (literais
//     `#fff` / `#fff`@10%), byte-idênticas dos dois lados — não são apelidos
//     semânticos do BaV. Regra 1 NÃO disparada (mesma régua de utility
//     homônimo do `bg-success/N` / `border-success/40`, §3.17 decisão 2): não
//     há tradução porque o valor já é idêntico nos dois lados. On-color do
//     avatar sobre o gradiente.

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
        'border-line-default border-b bg-surface-raised',
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
        <p className="text-fg-tertiary text-xs uppercase tracking-wider">
          Sua área
        </p>
        <p className="truncate font-medium text-fg-primary">
          {displayName ?? email.split('@')[0]}
        </p>
        <p className="truncate text-fg-tertiary text-xs">
          <span>{email}</span>
          {uf ? <span className="ml-2">· {uf}</span> : null}
        </p>
      </div>
    </header>
  )
}
