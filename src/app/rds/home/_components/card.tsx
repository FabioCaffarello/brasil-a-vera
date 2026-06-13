// Cópia-rds de src/design-system/primitives/card.tsx — onda HeroSection
// (home /). MANTIDA LOCAL (não adotada do RDS): o Card compound do RDS
// (Card.Header/Card.Title/Card.Body) não mapeia 1:1 para este primitivo
// shadcn-style (CardHeader/CardContent/CardFooter/CardTitle/CardDescription),
// que os cards de entrada da home (card-parlamentares, card-votacoes-semana)
// usam com layout flex-col + footer ancorado embaixo (CardContent flex-1 +
// CardFooter). Adotar o RDS exigiria reescrever a estrutura dos dois cards —
// mudança estrutural, não tradução. Mesma régua das cópias locais (Button/
// EmptyState/Input) quando o equivalente RDS não cobre a API. Server-safe
// (forwardRef divs, sem hooks) → zero-JS (ADR-022). Original INTOCADO.
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   bg-surface             → bg-surface-base
//   text-foreground        → text-fg-primary
//   border-border          → border-line-default
//   text-foreground-muted  → text-fg-tertiary

import * as React from 'react'

import { cn } from '@/lib/cn'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-line-default bg-surface-base text-fg-primary shadow-sm',
      className,
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-fg-tertiary', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
