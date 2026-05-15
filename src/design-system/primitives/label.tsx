'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Label primitive — Sprint 4.0 PR 6.
 * Copiado via `npx shadcn@latest add label` em 2026-05-15.
 *
 * NÃO requer adaptação de tokens — usa apenas utilitários base
 * (text-sm, font-medium, peer-disabled:*) que já existem em Tailwind v4.
 *
 * Vantagem do Radix Label sobre <label> nativo:
 * - Click no Label ativa o input associado (htmlFor) — comportamento
 *   nativo do <label>, preservado.
 * - Click no Label NÃO seleciona texto duplo-clique (UX em forms).
 * - Funciona com peer- (peer-disabled aplica opacity automática quando
 *   input está disabled).
 *
 * Cliente: Radix Label usa hooks internos para tracking de associação.
 */

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
