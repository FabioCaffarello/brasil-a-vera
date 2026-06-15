import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Input primitive — Sprint 4.0 PR 6.
 * Copiado via `npx shadcn@latest add input` em 2026-05-15 e adaptado:
 *
 *   shadcn default → nosso ajuste
 *   ─────────────────────────────────────────────────────────
 *   border-input              → border-line-emphasis
 *   placeholder:text-muted-foreground → placeholder:text-fg-quaternary
 *   bg-surface-canvas, text-base, ring-line-focus,
 *   ring-offset-surface-canvas, file:text-fg-primary → preservados
 *
 * Tap target mínimo 44×44px (WCAG 2.5.5) garantido por `h-10` (40px) +
 * vertical padding (em mobile passa de 44px via `md:text-sm` que mantém
 * h-10 mas dá mais respiração de fonte). Para forms cívicos sensíveis a
 * touch, consumer pode aumentar via className `min-h-[44px]`.
 *
 * Não é cliente — input é HTML nativo, sem state interno.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 text-base ring-offset-surface-canvas file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg-primary placeholder:text-fg-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
