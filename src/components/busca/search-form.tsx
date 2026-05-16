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
// Sprint 4.4 PR 3 — migrado para primitivas Input + Button (Server
// Component compatíveis). `<label className="sr-only">` mantido nativo
// — Label primitive (Radix) é `'use client'` e não agrega valor para
// labels visualmente escondidas (sem click-target ou peer-disabled).
//
// Header variant preserva animação de width on focus
// (`w-32 focus:w-48 sm:w-48 sm:focus:w-64`) via className override.
export function SearchForm({ defaultValue, variant = 'header' }: Props) {
  if (variant === 'header') {
    return (
      <search>
        <form action="/busca" className="flex items-center" method="get">
          <label className="sr-only" htmlFor="search-header">
            Buscar parlamentares, proposições e votações
          </label>
          <Input
            autoComplete="off"
            className="w-32 transition-all duration-150 focus:w-48 sm:w-48 sm:focus:w-64"
            defaultValue={defaultValue}
            id="search-header"
            name="q"
            placeholder="Buscar…"
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
        <Input
          autoComplete="off"
          className="flex-1"
          defaultValue={defaultValue}
          id="search-page"
          name="q"
          placeholder="Nome do parlamentar, ementa, descrição da votação ou PL 1234/2025"
          type="search"
        />
        <Button type="submit">Buscar</Button>
      </form>
    </search>
  )
}
