'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import type { Municipio, Uf } from '@/lib/municipios'

interface Props {
  uf: Uf
  municipios: Municipio[]
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Autocomplete com filtro em-memória. Recebe o subset de municípios da UF
// (8 a ~853 entradas) já carregado server-side — sem fetch de runtime.
// Padrão WAI-ARIA combobox (input + listbox).
export function MunicipioAutocomplete({ uf, municipios }: Props) {
  const router = useRouter()
  const inputId = useId()
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const matches = useMemo(() => {
    if (query.trim().length === 0) return municipios.slice(0, 8)
    const norm = normalize(query)
    return municipios
      .filter((m) => normalize(m.nome).includes(norm))
      .slice(0, 12)
  }, [query, municipios])

  useEffect(() => {
    if (!open) return
    function handlePointer(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
    }
  }, [open])

  function navigate(municipio: string) {
    const params = new URLSearchParams({ uf, municipio })
    router.push(`/o-meu-parlamentar?${params.toString()}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlightIdx((i) => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = matches[highlightIdx]
      if (selected) navigate(selected.nome)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-medium text-sm text-zinc-700 dark:text-zinc-300"
      >
        Município
      </label>
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        placeholder="Comece a digitar o nome…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlightIdx(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="min-h-[44px] w-full rounded border border-zinc-300 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800"
      />
      {open && matches.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`Municípios de ${uf}`}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        >
          {matches.map((m, i) => (
            <div
              key={m.id}
              role="option"
              tabIndex={-1}
              aria-selected={i === highlightIdx}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlightIdx
                  ? 'bg-primary-50 text-primary-900 dark:bg-primary-900 dark:text-primary-50'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
              onMouseEnter={() => setHighlightIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                navigate(m.nome)
              }}
            >
              {m.nome}
            </div>
          ))}
        </div>
      )}
      {open && matches.length === 0 && query.trim().length > 0 && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Nenhum município de {uf} corresponde a &quot;{query}&quot;.
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {municipios.length === 1
          ? `${uf} tem 1 município.`
          : `${uf} tem ${municipios.length} municípios.`}{' '}
        Use as setas do teclado para navegar.
      </p>
    </div>
  )
}
