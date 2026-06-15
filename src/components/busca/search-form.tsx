import { Search } from 'lucide-react'

import { Button } from '@/design-system/primitives/button'
import { Input } from '@/design-system/primitives/input'

interface Props {
  defaultValue?: string
  variant?: 'header' | 'page'
}

// Server Component — `<form>` GET submete pra /busca, RSC re-renderiza.
// Sem JS de client.
//
// `<search>` é landmark HTML5 nativo para regiões de busca — substitui o
// `role="search"` no <form>.
//
// Header variant pós-spike navbar:
// - Ícone Search lucide à esquerda dentro do input (decorativo, aria-hidden)
// - Esconde em < md (navbar mobile expõe SearchForm variant="page" dentro
//   do painel embutido NavMobile — não duplicamos o input no topo apertado)
// - Largura responsiva: w-44 → w-56 em focus (lg amplia para w-64/w-80)
export function SearchForm({ defaultValue, variant = 'header' }: Props) {
  if (variant === 'header') {
    return (
      <search className="hidden md:block">
        <form action="/busca" className="relative" method="get">
          <label className="sr-only" htmlFor="search-header">
            Buscar parlamentares, proposições e votações
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-quaternary"
          />
          <Input
            autoComplete="off"
            className="h-9 w-44 pl-9 transition-[width] duration-200 ease-out focus:w-56 lg:w-56 lg:focus:w-72"
            defaultValue={defaultValue}
            id="search-header"
            name="q"
            placeholder="Buscar PL, parlamentar…"
            type="search"
          />
        </form>
      </search>
    )
  }

  return (
    <search>
      <form action="/busca" className="flex items-center gap-2" method="get">
        <label className="sr-only" htmlFor="search-page">
          Buscar parlamentares, proposições e votações
        </label>
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-quaternary"
          />
          <Input
            autoComplete="off"
            className="pl-9"
            defaultValue={defaultValue}
            id="search-page"
            name="q"
            placeholder="Nome do parlamentar, ementa, descrição da votação ou PL 1234/2025"
            type="search"
          />
        </div>
        <Button type="submit">Buscar</Button>
      </form>
    </search>
  )
}
