'use client'

import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Separator primitive — Sprint 4.0 PR 6.
 * Copiado via `npx shadcn@latest add separator` em 2026-05-15.
 *
 * NÃO requer adaptação de tokens — `bg-border` já mapeia para o
 * --color-border definido em globals.css desde Sprint 4.0 PR 2.
 *
 * Vantagem do Radix Separator sobre <hr> nativo:
 * - `decorative={true}` (default) marca como `role="none"` para leitor
 *   de tela (separador visual sem semântica de seção).
 * - `decorative={false}` marca como `role="separator"` com aria-orientation
 *   — útil quando o separador divide grupos semânticos (ex.: entre listas).
 *
 * Cliente: Radix Separator é minimalista mas exige "use client" pra
 * processar a prop `decorative` corretamente.
 */
const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref,
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className,
      )}
      {...props}
    />
  ),
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
