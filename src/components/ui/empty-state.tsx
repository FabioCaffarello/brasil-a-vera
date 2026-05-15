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
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 border-dashed bg-zinc-50/50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
      {Icon && (
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon aria-hidden className="size-6" />
        </div>
      )}
      <p className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
        {title}
      </p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
