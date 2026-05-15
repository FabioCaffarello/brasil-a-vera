import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Badge primitive — Sprint 4.0 PR 4.
 * Copiado via `npx shadcn@latest add badge` em 2026-05-15 e adaptado:
 *
 *   shadcn default → nosso token
 *   ─────────────────────────────────────────────────────────
 *   bg-primary / text-primary-foreground → bg-brand / text-brand-foreground
 *   bg-secondary / text-secondary-foreground →
 *     bg-surface-elevated / text-foreground
 *   bg-destructive / text-destructive-foreground → preservado
 *   text-foreground (outline) → preservado
 *
 * Focus ring usa --ring (WCAG 2.4.7). Não confundir com TrustBadge
 * (componente de domínio em src/components/trust/) que é uma composição
 * de Badge + ícone Lucide.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-brand text-brand-foreground hover:bg-brand/80',
        secondary:
          'border-transparent bg-surface-elevated text-foreground hover:bg-surface-elevated/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
