// SubTabs (Acompanhando | Da minha UF) — Wave 10 Etapa 4.
//
// Navegação via Next `<Link>` preserva URL state em `?tab=`. Component
// é client por causa de `usePathname` para decidir o ativo, mas só
// renderiza <Link> — sem fetch nem interatividade complexa.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'

export type TabKey = 'acompanhando' | 'da-minha-uf'

interface Props {
  active: TabKey
  acompanhandoCount: number
  daMinhaUfCount: number | null
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'acompanhando', label: 'Acompanhando' },
  { key: 'da-minha-uf', label: 'Da minha UF' },
]

export function SubTabs({ active, acompanhandoCount, daMinhaUfCount }: Props) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Sub-tabs"
      className="flex gap-1 border-border-strong border-b"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active
        const count =
          tab.key === 'acompanhando' ? acompanhandoCount : daMinhaUfCount
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
            {count !== null && (
              <span className="ml-1.5 text-foreground-subtle">({count})</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
