// Cópia-rds de src/design-system/compositions/section-card.tsx — onda
// HeroSection (home /). Reuso VERBATIM da cópia da piloto-2
// (src/app/rds/parlamentares/[id]/_components/section-card.tsx) / das ondas
// HeroSection #4 /busca e #5 /comparar: reconstruída SOBRE o Card compound do
// RDS (N1) — asSection + aria-labelledby + Card.Title(icon/badge/as). A API
// local (title/subtitle/icon/badge/id) é preservada para manter o diff legível.
//
// scroll-mt-28 embutido (compensa navbar sticky no jump por anchor — a home
// usa id="piramide-confianca" para o link #piramide-confianca do TrustBadge).
//
// Diferenças visuais aceitas (registradas se acumularem):
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
