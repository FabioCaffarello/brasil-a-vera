// Cópia-rds de src/design-system/primitives/button.tsx — migração painel
// (área logada /rds/painel). Reuso VERBATIM da cópia das ondas anteriores
// (listagens /parlamentares|/proposicoes|/votacoes, /busca, /comparar, home).
// O Button do RDS NÃO está no /server (é client; +JS) e o local diverge em
// token de marca; por isso a cópia local traduzida.
//
// NB área logada: ADR-022 (zero-JS anônimo) NÃO restringe aqui — mas a cópia
// local é Server Component (forwardRef sem hooks) e mantém o token-clean, então
// não há razão de adotar o Button client do RDS (perderia o token-clean sem
// ganhar funcionalidade). Mesma régua das ondas anteriores.
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   bg-brand            → bg-fg-brand          (byte-idêntico pós-#358)
//   text-brand          → text-fg-brand        (idem)
//   border-border-strong→ border-line-emphasis
//   bg-background       → bg-surface-canvas
//   bg-surface-elevated → bg-surface-raised
//   text-foreground     → text-fg-primary
//   ring-ring           → ring-line-focus
//   ring-offset-background → ring-offset-surface-canvas
//
// Tokens MANTIDOS (resíduo do projeto, ADR-024 / sem par RDS — mesma
// régua das ondas anteriores): brand-foreground (on-color do CTA),
// destructive / destructive-foreground (variante preservada para paridade
// de API).

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-surface-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-fg-brand text-brand-foreground hover:bg-fg-brand/90',
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
