'use client'

// Cópia-rds de src/components/painel/tab-bar.tsx — migração painel
// (área logada /rds/painel).
//
// Decisão-chave #1 do scoping (TabBar → TabsAsLinks do RDS /server, API 1:1):
// os 5 pilares viram itens de `TabsAsLinks variant="default"`. O mapeamento
// de props é byte-a-byte:
//   TabAsLink { label, href, active?, icon?, count? } ↔ original
//   counters[tab] → count   ·   ícone lucide → icon   ·   href idem (→ /rds/)
//
// Por que ainda é 'use client': a API do TabsAsLinks delega a DERIVAÇÃO do
// estado ativo ao chamador (lê do URL e passa `active`). O painel layout é
// server e NÃO recebe searchParams (razão de ser do ActiveSlotPicker), então
// este wrapper fino lê `useSearchParams()`, computa `active`, e renderiza o
// TabsAsLinks (server-safe, importado do /server) com `linkComponent={Link}`
// para manter a navegação client-side / prefetch — exatamente o que o original
// fazia com `<Link>`.
//
// Diferenças visuais da ADOÇÃO do componente RDS (não tradução de token —
// mesma régua da typography do HeroSection, §3.14 decisão 1):
//   - active: o RDS usa `border-line-brand text-fg-brand-emphasis font-medium`
//     (vs `border-brand text-foreground` local) — typography/cor do componente
//     adotado, não token fora do mapa.
//   - count: o RDS renderiza um pill arredondado (`bg-surface-muted
//     text-fg-secondary text-xs`) em vez do `· N` em middot local — é a
//     apresentação do slot `count` do componente, prop que mapeia 1:1.
//   - container: `<nav>` com `aria-label` (o RDS exige nome acessível) +
//     `border-b` próprio do componente.

import { TabsAsLinks } from '@fabio.caffarello/react-design-system/server'
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
    <div className="mx-auto max-w-6xl overflow-x-auto px-4">
      <TabsAsLinks
        aria-label="Tabs do painel"
        items={TABS.map((tab) => {
          const Icon = tab.icon
          const count = counters[tab.key]
          return {
            label: tab.label,
            href: `/rds/painel?tab=${tab.key}`,
            active: tab.key === activeTab,
            icon: <Icon aria-hidden="true" className="size-4" />,
            // Counter só quando > 0 (zero state limpo, igual ao original).
            count: count !== undefined && count > 0 ? count : undefined,
          }
        })}
        linkComponent={Link}
        variant="default"
      />
    </div>
  )
}
