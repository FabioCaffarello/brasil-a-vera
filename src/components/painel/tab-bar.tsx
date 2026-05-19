'use client'

// TabBar — Fase 2 do refator do painel pós-Wave 10
// (RFC `docs/product/REFACTOR-PAINEL-TABS.md` §3, ADR-032).
//
// 5 pilares do painel logado em ordem definida pela decisão de produto:
// Resumo (default), Parlamentares, Alertas, Configurações, Meus dados.
// `?tab=meus-dados` (kebab URL slug) — Meus Dados promovida de sub-rota
// a tab principal (privacidade como pilar, VISION §1 ponto 2).
//
// Active state via `useSearchParams().get('tab')` + parseTab para
// garantir TabKey válido. Link emite `/painel?tab=...` direto (sem
// preservar `?subtab=` do estado atual — trocar de tab principal
// reseta para o default da nova tab, comportamento natural).
//
// AP4 (RFC §12): componente bound ao painel; sem generificar agora.

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { cn } from '@/lib/cn'
import { parseTab, type TabKey } from '@/lib/painel-tabs'

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'parlamentares', label: 'Parlamentares' },
  { key: 'alertas', label: 'Alertas' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'meus-dados', label: 'Meus dados' },
]

export function TabBar() {
  const activeTab = parseTab(useSearchParams().get('tab'))

  return (
    <nav
      aria-label="Tabs do painel"
      className="border-border border-b bg-surface"
    >
      <ul className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <li key={tab.key}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 font-medium text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  isActive
                    ? 'border-brand text-foreground'
                    : 'border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground',
                )}
                href={`/painel?tab=${tab.key}`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
