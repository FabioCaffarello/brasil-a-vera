'use client'

// SubTabs (Recebidos | Políticas) — Wave 10 Etapa 6.
//
// Pattern espelhando /painel/parlamentares/sub-tabs (Etapa 4):
// navegação via <Link> preservando URL state em `?tab=`. Sem
// interatividade — só renderiza links.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'

export type TabKey = 'recebidos' | 'politicas'

interface Props {
  active: TabKey
  recebidosCount: number | null
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'recebidos', label: 'Recebidos' },
  { key: 'politicas', label: 'Políticas' },
]

export function SubTabs({ active, recebidosCount }: Props) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Sub-tabs de alertas"
      className="flex gap-1 border-border-strong border-b"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active
        const showCount = tab.key === 'recebidos' && recebidosCount !== null
        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm transition-colors',
              isActive
                ? 'border-brand text-foreground'
                : 'border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground',
            )}
            href={`${pathname}?tab=${tab.key}`}
            key={tab.key}
          >
            {tab.label}
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
