import type * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Skeleton primitive — Sprint 4.0 PR 4.
 * Copiado via `npx shadcn@latest add skeleton` em 2026-05-15 e adaptado:
 *
 *   shadcn default → nosso token
 *   ─────────────────────────────────
 *   bg-muted → bg-surface-elevated
 *
 * Razão: ainda não temos --color-muted no design system; surface-elevated
 * tem lightness adequada para sugerir "placeholder shimmer" tanto em dark
 * (oklch 0.20) quanto em light (oklch 1).
 *
 * IMPORTANTE: o `animate-pulse` é o efeito visual de carregamento.
 * @media (prefers-reduced-motion: reduce) em globals.css zera a animação
 * automaticamente — leitor com reduced-motion vê um placeholder estático,
 * acessível (WCAG 2.3.3).
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-elevated', className)}
      {...props}
    />
  )
}

export { Skeleton }
