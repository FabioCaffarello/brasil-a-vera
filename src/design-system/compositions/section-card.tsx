// SectionCard — promovido ao RDS (migração ADR-033). Reconstruído SOBRE o
// Card compound do RDS (@fabio.caffarello/react-design-system/server): asSection
// + aria-labelledby + Card.Title(icon/badge). A API local
// (title/subtitle/icon/badge/children/className/id) é PRESERVADA — todos os
// consumidores (home, comparar, busca, 3 perfis) seguem inalterados.
//
// scroll-mt-28 embutido (compensa navbar sticky no jump por anchor do SectionNav).

import { Card } from '@fabio.caffarello/react-design-system/server'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type SectionCardProps = {
  /** Título da seção — renderizado como `<h2>` (default do Card.Title). */
  title: ReactNode
  /** Subtítulo opcional logo abaixo do título. */
  subtitle?: ReactNode
  /** Ícone à esquerda do título (geralmente lucide-react). */
  icon?: ReactNode
  /** Slot direito do header (TrustBadge/DataBadge). */
  badge?: ReactNode
  /** Conteúdo da seção. */
  children: ReactNode
  className?: string
  /** Id para anchor navigation (SectionNav). */
  id?: string
}

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
    <Card
      asSection
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn('scroll-mt-28', className)}
      id={id}
    >
      <Card.Header>
        <Card.Title
          badge={badge}
          icon={icon}
          id={id ? `${id}-title` : undefined}
        >
          {title}
        </Card.Title>
        {subtitle ? <Card.Subtitle>{subtitle}</Card.Subtitle> : null}
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  )
}
