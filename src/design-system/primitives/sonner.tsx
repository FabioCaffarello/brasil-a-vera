'use client'

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from 'lucide-react'
import type * as React from 'react'
import { Toaster as Sonner } from 'sonner'

/**
 * Toaster primitive — Sprint 4.0 PR 5.
 * Copiado via `npx shadcn@latest add sonner` em 2026-05-15 e adaptado:
 *
 *   shadcn default → nosso ajuste
 *   ─────────────────────────────────────────────────────────
 *   useTheme()                        → theme="dark" literal
 *   bg-primary / text-primary-foreground → bg-brand / text-brand-foreground
 *   bg-muted / text-muted-foreground  → bg-surface-elevated / text-foreground-muted
 *   border-border / bg-background / text-foreground → preservados
 *
 * Razão de remover `next-themes` (D4 do plano da Sprint 4.0):
 *   No 4.0 NÃO há toggle dark/light. Tema dark é padrão (Wave 4).
 *   Hardcode `theme="dark"` mantém Toaster alinhado com a paleta dark
 *   sem peer dep de 3kb. Quando o toggle entrar (4.1+), volta a usar
 *   useTheme() — atualização concentrada nesta primitiva.
 *
 * Cliente: `"use client"` é obrigatório (Sonner gerencia state via
 * useStore interno). Importadores podem ser RSC — só o subtree do
 * Toaster vira ilha cliente.
 */
type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-foreground-muted',
          actionButton:
            'group-[.toast]:bg-brand group-[.toast]:text-brand-foreground',
          cancelButton:
            'group-[.toast]:bg-surface-elevated group-[.toast]:text-foreground-muted',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
