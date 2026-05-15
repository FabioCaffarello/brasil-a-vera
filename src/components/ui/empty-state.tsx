import type { LucideIcon } from 'lucide-react'

interface Props {
  /** Ícone Lucide opcional, decorativo (aria-hidden). */
  icon?: LucideIcon
  title: string
  description?: string
  /** Ação opcional — geralmente um link "Limpar filtros" ou similar. */
  action?: React.ReactNode
}

// Empty state visualmente refinado para listagens. Não substitui os
// empty states densos com copy honesto (Top 5, Pares, Alinhamento, etc)
// — apenas para casos onde a ausência é por filtro/contexto, não por
// limitação estrutural do dado.
//
// Sprint 3.1 Tarefa 4.B — refinement aplicado.
// Sprint 4.2 PR 3 — migrado para tokens semânticos OKLCH.
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="rounded-lg border border-border border-dashed bg-surface/50 p-8 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-surface-elevated text-foreground-muted">
          <Icon aria-hidden className="size-6" />
        </div>
      )}
      <p className="font-medium text-foreground text-sm">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-foreground-muted text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
