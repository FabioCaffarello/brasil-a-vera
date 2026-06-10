// Cópia-rds de src/design-system/compositions/section-card.tsx
// (piloto-2) — reconstruída SOBRE o Card compound do RDS 3.5.0 (N1):
// asSection + aria-labelledby + Card.Title(icon/badge/as) cobrem o
// contrato inteiro da composição local. A API local (title/subtitle/
// icon/badge/id) é preservada para manter o diff do page.tsx legível.
//
// scroll-mt-28 embutido: todos os 6 usos do perfil passavam essa classe
// (compensa navbar sticky + SectionNav no jump por anchor).
//
// Diferenças visuais aceitas (registrar se acumular):
// - padding do Card RDS (medium) vs p-6 sm:p-8 do original
// - typography do Card.Title vs font-semibold text-xl tracking-tight

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
