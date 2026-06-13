// Cópia-rds de src/components/busca/search-form.tsx — onda HeroSection
// (rota /busca). Original INTOCADO.
//
// É SERVER COMPONENT (apesar do nome "form"): `<form>` GET nativo submete
// pra /rds/busca e o RSC re-renderiza. SEM `'use client'`, sem JS de
// client — `<search>` é landmark HTML5 nativo, o input é HTML nativo.
// Mantém zero-JS (ADR-022). Importa o Button e o Input das cópias LOCAIS
// traduzidas (token-clean), não os primitivos do original.
//
// form `action` reescrito pra /rds/busca (navegação CONTIDA na staging;
// precedente de hrefs de filtro das pilotos 2–6 e das 3 listagens).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   text-foreground-subtle → text-fg-quaternary (ícone Search decorativo)
// Demais classes são layout/Tailwind puro (sem token semântico).

import { Search } from 'lucide-react'

import { Button } from './button'
import { Input } from './input'

interface Props {
  defaultValue?: string
  variant?: 'header' | 'page'
}

export function SearchForm({ defaultValue, variant = 'header' }: Props) {
  if (variant === 'header') {
    return (
      <search className="hidden md:block">
        <form action="/rds/busca" className="relative" method="get">
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
      <form
        action="/rds/busca"
        className="flex items-center gap-2"
        method="get"
      >
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
