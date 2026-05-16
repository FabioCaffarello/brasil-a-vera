'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Popover primitive — Sprint 5.0 PR 5 (teste E2E do subagent
 * design-system-curator).
 *
 * Copiado via `npx shadcn@latest add popover` em 2026-05-16 e adaptado:
 *
 *   shadcn default                   → nosso ajuste
 *   ─────────────────────────────────────────────────────────
 *   bg-popover                       → bg-surface-elevated
 *   text-popover-foreground          → text-foreground
 *   border (default cor)             → border-border (explícito)
 *   double quotes                    → single quotes (Biome)
 *
 * Animações `data-[state=open]:animate-in` etc. mantidas; ficam no-op até
 * a Wave 4 ter mergeado `tw-animate-css` (decisão do PR 7 da Sprint 4.0).
 * Radix gerencia state via mount/unmount — sem animações apenas significa
 * transições instantâneas.
 *
 * A11y crítica (Radix garante): focus management dentro do popover,
 * Esc fecha, click fora fecha, aria-* corretamente vinculados via
 * trigger/content.
 */

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border border-border bg-surface-elevated p-4 text-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverContent, PopoverTrigger }
