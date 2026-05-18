'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * Accordion primitive — Sprint 7.2 PR 4.
 * Copiado via `npx shadcn@latest add accordion` em 2026-05-18 e adaptado:
 *
 *   shadcn default → nosso ajuste
 *   ─────────────────────────────────────────────────────────
 *   border-b (AccordionItem)         → border-b border-border
 *   hover:underline (Trigger)        → hover:text-foreground (underline → subtle color shift)
 *   bg-muted / text-muted-foreground → não presentes na versão shadcn de accordion
 *
 * Consumer concreto: wrap de SectionCards em
 * `src/app/parlamentares/[id]/page.tsx` (Sprint 7.2 PR 4).
 * Usado com `type="multiple"` e `defaultValue=["votos","alinhamento"]`
 * para colapsar seções no mobile (abaixo de `sm:`).
 *
 * A11y crítica (Radix garante): keyboard navigation (↑/↓/Home/End/Enter/Space),
 * aria-expanded, aria-controls, role="region"/"button", focus visible.
 * `prefers-reduced-motion` coberto pelo override global em globals.css §6.
 */
const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('border-b border-border', className)}
    {...props}
  />
))
AccordionItem.displayName = 'AccordionItem'

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-4 text-sm font-medium text-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 text-foreground-muted transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm text-foreground-muted data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
