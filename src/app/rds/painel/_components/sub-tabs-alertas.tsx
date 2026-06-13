// Cópia-rds de src/components/painel/alertas/sub-tabs.tsx — migração painel
// (área logada /rds/painel).
//
// Decisão-chave #1 do scoping (SubTabs → TabsAsLinks variant="sub", API 1:1):
// 2 sub-tabs (Recebidos | Políticas) viram itens de `TabsAsLinks variant="sub"`.
// O count só aparece na sub-tab "recebidos" (e só quando != null), igual ao
// original. Mapeamento byte-a-byte: TabAsLink { label, href, active?, count? }.
//
// Cópia SERVER (sem 'use client'): o active vem por prop do slot page; o
// TabsAsLinks já emite aria-current. linkComponent={Link} preserva navegação
// client-side. Mesma régua da sub-tabs-parlamentares.

import { TabsAsLinks } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

import type { AlertasSubtab } from '@/lib/painel-tabs'

interface Props {
  active: AlertasSubtab
  recebidosCount: number | null
}

const SUBTABS: { key: AlertasSubtab; label: string }[] = [
  { key: 'recebidos', label: 'Recebidos' },
  { key: 'politicas', label: 'Políticas' },
]

export function SubTabsAlertas({ active, recebidosCount }: Props) {
  return (
    <TabsAsLinks
      aria-label="Sub-tabs de alertas"
      items={SUBTABS.map((subtab) => {
        const showCount = subtab.key === 'recebidos' && recebidosCount !== null
        return {
          label: subtab.label,
          href: `/rds/painel?tab=alertas&subtab=${subtab.key}`,
          active: subtab.key === active,
          count: showCount ? (recebidosCount as number) : undefined,
        }
      })}
      linkComponent={Link}
      variant="sub"
    />
  )
}
