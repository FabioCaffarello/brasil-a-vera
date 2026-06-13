import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Button primitive — Sprint 4.0 PR 3.
 * Copiado via `npx shadcn@latest add button` em 2026-05-15 e adaptado aos
 * tokens do design system (ver ADR-021 §3 — processo de adoção):
 *
 *   shadcn default → nosso token
 *   ─────────────────────────────────────────────────────────
 *   bg-primary           → bg-brand
 *   text-primary-foreground → text-brand-foreground
 *   text-primary (link)  → text-brand
 *   bg-accent (hover)    → bg-surface-elevated
 *   text-accent-foreground → text-foreground
 *   bg-secondary         → bg-surface-elevated
 *   text-secondary-foreground → text-foreground
 *   border-input         → border-border-strong
 *
 * Fase B (ADR-034) — neutros traduzidos para tokens RDS (token-map.md):
 *   border-border-strong → border-line-emphasis · bg-background → bg-surface-canvas
 *   bg-surface-elevated → bg-surface-raised · text-foreground → text-fg-primary
 *   text-brand (link) → text-fg-brand (byte-idêntico pós-#358)
 *   ring-ring → ring-line-focus · ring-offset-background → ring-offset-surface-canvas
 * Mantidos como resíduos BaV (sem par on-color no RDS): a variante `default`
 * (bg-brand = navy-400, byte-idêntica à brand-primary-400 do RDS) e
 * `destructive` (bg-destructive + text-destructive-foreground — RDS não tem
 * token on-error sólido; mesmo caso do success-foreground, token-map piloto-3).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-surface-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand text-brand-foreground hover:bg-brand/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-line-emphasis bg-surface-canvas hover:bg-surface-raised hover:text-fg-primary',
        secondary:
          'bg-surface-raised text-fg-primary hover:bg-surface-raised/80',
        ghost: 'hover:bg-surface-raised hover:text-fg-primary',
        link: 'text-fg-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
