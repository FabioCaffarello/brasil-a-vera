// Cópia-rds de src/components/ui/empty-state.tsx — onda HeroSection
// (listagem /parlamentares). O EmptyState do RDS existe mas só no entry
// raiz (client; +JS contra ADR-022). Por ser apresentacional puro
// (server-safe) e ter divergência de token BaV, a cópia local traduzida
// mantém zero-JS + token-clean.
//
// Original INTOCADO. Tradução EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   border-border       → border-line-default
//   bg-surface/50       → bg-surface-base/50
//   bg-surface-elevated → bg-surface-raised
//   text-foreground-muted → text-fg-tertiary
//   text-foreground     → text-fg-primary

import type { LucideIcon } from 'lucide-react'

interface Props {
  /** Ícone Lucide opcional, decorativo (aria-hidden). */
  icon?: LucideIcon
  title: string
  description?: string
  /** Ação opcional — geralmente um link "Limpar filtros" ou similar. */
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="rounded-lg border border-line-default border-dashed bg-surface-base/50 p-8 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-raised text-fg-tertiary">
          <Icon aria-hidden className="size-6" />
        </div>
      )}
      <p className="font-medium text-fg-primary text-sm">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-fg-tertiary text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
