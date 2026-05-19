'use client'

// SubTabs (Recebidos | Políticas) — Wave 10 Etapa 6, atualizado na
// Fase 2 do refator pós-Wave 10 (RFC §6).
//
// Mudança Fase 2: URL state vira `?subtab=` (não mais `?tab=`); main
// tab fixa em `alertas` no href. Type renomeado para `AlertasSubtab`
// e importado do util central `@/lib/painel-tabs`.
//
// Pattern espelhando /painel/@parlamentares/sub-tabs.

import Link from 'next/link'

import { cn } from '@/lib/cn'
import type { AlertasSubtab } from '@/lib/painel-tabs'

interface Props {
  active: AlertasSubtab
  recebidosCount: number | null
}

const SUBTABS: { key: AlertasSubtab; label: string }[] = [
  { key: 'recebidos', label: 'Recebidos' },
  { key: 'politicas', label: 'Políticas' },
]

export function SubTabs({ active, recebidosCount }: Props) {
  return (
    <nav
      aria-label="Sub-tabs de alertas"
      className="flex gap-1 border-border-strong border-b"
    >
      {SUBTABS.map((subtab) => {
        const isActive = subtab.key === active
        const showCount = subtab.key === 'recebidos' && recebidosCount !== null
        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm transition-colors',
              isActive
                ? 'border-brand text-foreground'
                : 'border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground',
            )}
            href={`/painel?tab=alertas&subtab=${subtab.key}`}
            key={subtab.key}
          >
            {subtab.label}
            {showCount && (
              <span className="ml-1.5 text-foreground-subtle">
                ({recebidosCount})
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
