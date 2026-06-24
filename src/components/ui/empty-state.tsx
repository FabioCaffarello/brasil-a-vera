import { EmptyStateBase } from '@fabio.caffarello/react-design-system/server'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  /** Ícone Lucide opcional, decorativo (aria-hidden). */
  icon?: LucideIcon
  title: string
  description?: string
  /** Ação opcional — geralmente um link "Limpar filtros" ou similar. */
  action?: ReactNode
}

// Empty state de listagem, consolidado sobre o `EmptyStateBase` server-safe do
// RDS (ADR-053; issue #252, v4.9). O layout (title/message/illustration/action)
// vem do core do design system; este wrapper só mapeia a API do projeto
// (icon→illustration em círculo, description→message) e preserva a borda
// dashed. Zero-JS — o slot `action` aceita um `<a href>` server-rendered.
//
// Não substitui os empty states densos com copy honesto (Top 5, Pares,
// Alinhamento, etc) — apenas casos onde a ausência é por filtro/contexto.
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <EmptyStateBase
      action={action}
      className="rounded-lg border border-line-default border-dashed bg-surface-base/50 p-8 text-center"
      illustration={
        Icon ? (
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-raised text-fg-tertiary">
            <Icon aria-hidden className="size-6" />
          </div>
        ) : undefined
      }
      message={description}
      title={title}
    />
  )
}
