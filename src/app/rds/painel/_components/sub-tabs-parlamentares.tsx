// Cópia-rds de src/components/painel/parlamentares/sub-tabs.tsx — migração
// painel (área logada /rds/painel).
//
// Decisão-chave #1 do scoping (SubTabs → TabsAsLinks variant="sub", API 1:1):
// 2 sub-tabs (Acompanhando | Da minha UF) viram itens de `TabsAsLinks
// variant="sub"`. Mapeamento de props byte-a-byte:
//   TabAsLink { label, href, active?, count? } ↔ original
//   count (contagem entre parênteses no original) → count (pill do RDS)
//
// Nota: o original era 'use client' SÓ para emitir <Link> com aria-current
// baseado na prop `active` (NÃO usava useSearchParams — o slot page deriva o
// active server-side). Com TabsAsLinks o `active` continua vindo por prop e o
// componente já emite `aria-current="page"`; então esta cópia é SERVER (sem
// 'use client') — estritamente menos JS que o original. `linkComponent={Link}`
// preserva a navegação client-side (cruza o boundary RSC como client ref).
//
// Diferença visual da ADOÇÃO (não tradução de token, mesma régua §3.14):
// active usa `border-line-brand text-fg-brand-emphasis` (vs `border-brand
// text-foreground` local); count vira pill (vs `(N)` em texto). Apresentação
// do componente adotado.

import { TabsAsLinks } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

import type { ParlamentaresSubtab } from '@/lib/painel-tabs'

interface Props {
  active: ParlamentaresSubtab
  acompanhandoCount: number
  daMinhaUfCount: number | null
}

const SUBTABS: { key: ParlamentaresSubtab; label: string }[] = [
  { key: 'acompanhando', label: 'Acompanhando' },
  { key: 'da-minha-uf', label: 'Da minha UF' },
]

export function SubTabsParlamentares({
  active,
  acompanhandoCount,
  daMinhaUfCount,
}: Props) {
  return (
    <TabsAsLinks
      aria-label="Sub-tabs"
      items={SUBTABS.map((subtab) => {
        const count =
          subtab.key === 'acompanhando' ? acompanhandoCount : daMinhaUfCount
        return {
          label: subtab.label,
          href: `/rds/painel?tab=parlamentares&subtab=${subtab.key}`,
          active: subtab.key === active,
          count: count !== null ? count : undefined,
        }
      })}
      linkComponent={Link}
      variant="sub"
    />
  )
}
