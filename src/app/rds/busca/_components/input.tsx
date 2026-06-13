// Cópia-rds de src/design-system/primitives/input.tsx — onda HeroSection
// (rota /busca). Usado pelo SearchForm local (o `<input type="search">`).
// O input é HTML nativo sem state interno — Server Component, zero-JS
// (mesma razão das cópias Button/EmptyState locais: manter zero-JS +
// token-clean contra ADR-022, em vez de importar o primitivo do original
// com tokens BaV não traduzidos).
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   border-border-strong            → border-line-emphasis
//   bg-background                   → bg-surface-canvas
//   ring-offset-background          → ring-offset-surface-canvas
//   file:text-foreground           → file:text-fg-primary
//   placeholder:text-foreground-subtle → placeholder:text-fg-quaternary
//   focus-visible:ring-ring        → focus-visible:ring-line-focus

import * as React from 'react'

import { cn } from '@/lib/cn'

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
