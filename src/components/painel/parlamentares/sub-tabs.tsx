// SubTabs (Acompanhando | Da minha UF) — Wave 10 Etapa 4, atualizado
// na Fase 2 do refator pós-Wave 10 (RFC §6).
//
// Mudança Fase 2: URL state vira `?subtab=` (não mais `?tab=`); main
// tab fixa em `parlamentares` no href (preserva contexto ao trocar
// sub-tab). Type renomeado para `ParlamentaresSubtab` e importado do
// util central `@/lib/painel-tabs`.
//
// Navegação via Next `<Link>` preserva URL state. Component continua
// client porque emite Link com `aria-current` baseado em prop active
// (sem `usePathname` — pathname agora é sempre `/painel`).

'use client'

import Link from 'next/link'

import { cn } from '@/lib/cn'
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

export function SubTabs({ active, acompanhandoCount, daMinhaUfCount }: Props) {
  return (
    <nav
      aria-label="Sub-tabs"
      className="flex gap-1 border-border-strong border-b"
    >
      {SUBTABS.map((subtab) => {
        const isActive = subtab.key === active
        const count =
          subtab.key === 'acompanhando' ? acompanhandoCount : daMinhaUfCount
        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm transition-colors',
              isActive
                ? 'border-brand text-foreground'
                : 'border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground',
            )}
            href={`/painel?tab=parlamentares&subtab=${subtab.key}`}
            key={subtab.key}
          >
            {subtab.label}
            {count !== null && (
              <span className="ml-1.5 text-foreground-subtle">({count})</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
