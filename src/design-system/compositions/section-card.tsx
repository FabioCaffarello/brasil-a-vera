import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type SectionCardProps = {
  /** Título da seção — renderizado como `<h2>`. */
  title: ReactNode
  /** Subtítulo opcional logo abaixo do título. */
  subtitle?: ReactNode
  /** Ícone à esquerda do título (geralmente lucide-react). */
  icon?: ReactNode
  /**
   * Slot direito do header. Geralmente um `<TrustBadge>` (L1-L4) ou
   * `<DataBadge>` (PR 6) indicando origem do dado.
   */
  badge?: ReactNode
  /** Conteúdo da seção. */
  children: ReactNode
  className?: string
  /** Id para anchor navigation (SectionNav, PR 5). */
  id?: string
}

/**
 * SectionCard — composição da Wave 6 (Sprint 6.0 PR 4).
 *
 * Wrapper de seção em página de perfil/listagem. Substitui o helper
 * `<Section>` inline que vive em `/proposicoes/[id]`, `/votacoes/[id]`,
 * `/parlamentares/[id]` — sem refatorar agora, só formaliza o padrão
 * como composição reutilizável.
 *
 * Header tem 3 slots: `icon`, `title`/`subtitle`, `badge`. Body recebe
 * `children`. Aceita `id` para integração futura com SectionNav (PR 5
 * desta sprint).
 *
 * Server Component. Sem state. Sem domínio acoplado.
 */
export function SectionCard({
  title,
  subtitle,
  icon,
  badge,
  children,
  className,
  id,
}: SectionCardProps) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-lg border border-border bg-surface p-6 sm:p-8',
        className,
      )}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon ? (
            <div
              className="mt-1 shrink-0 text-foreground-muted"
              aria-hidden="true"
            >
              {icon}
            </div>
          ) : null}
          <div className="space-y-1">
            <h2
              id={id ? `${id}-title` : undefined}
              className="font-semibold text-foreground text-xl tracking-tight"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="text-foreground-muted text-sm">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </header>
      {children}
    </section>
  )
}
