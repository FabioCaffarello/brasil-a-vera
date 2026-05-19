'use client'

// TabBar — Fase 3 do refator do painel pós-Wave 10 (RFC §5).
//
// 5 pilares com ícones lucide + counters (Parlamentares: follows,
// Alertas: unread inapp deliveries). Counters renderizam apenas
// quando > 0 (zero state limpo). Counter `· N` em
// `text-foreground-subtle` discreto, separado por middot.
//
// Ícones semanticamente alinhados:
//   - Resumo → LayoutDashboard
//   - Parlamentares → Users
//   - Alertas → BellRing (mesmo do FollowButton Hotfix 10.1)
//   - Configurações → Settings
//   - Meus dados → Shield (privacidade como pilar)
//
// AP4 (RFC §12): bound ao painel; sem generificar agora.

import {
  BellRing,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { cn } from '@/lib/cn'
import { parseTab, type TabKey } from '@/lib/painel-tabs'

interface Props {
  /** Mapa de contadores por tab. Counter só renderiza quando > 0. */
  counters: Partial<Record<TabKey, number>>
}

const TABS: readonly { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'resumo', label: 'Resumo', icon: LayoutDashboard },
  { key: 'parlamentares', label: 'Parlamentares', icon: Users },
  { key: 'alertas', label: 'Alertas', icon: BellRing },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
  { key: 'meus-dados', label: 'Meus dados', icon: Shield },
]

export function TabBar({ counters }: Props) {
  const activeTab = parseTab(useSearchParams().get('tab'))

  return (
    <nav
      aria-label="Tabs do painel"
      className="border-border border-b bg-surface"
    >
      <ul className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab
          const count = counters[tab.key]
          const Icon = tab.icon
          return (
            <li key={tab.key}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 font-medium text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  isActive
                    ? 'border-brand text-foreground'
                    : 'border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground',
                )}
                href={`/painel?tab=${tab.key}`}
              >
                <Icon aria-hidden="true" className="size-4" />
                <span>{tab.label}</span>
                {count !== undefined && count > 0 ? (
                  <span className="text-foreground-subtle text-xs">
                    · {count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
