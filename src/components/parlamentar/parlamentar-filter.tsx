'use client'

import { Search } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'

// Filtro client-side da rota "Quem me representa" (ilha de progressive
// enhancement). Opera sobre o DOM já renderizado no servidor: as seções e os
// cards são server components passados como `children`; este componente só
// esconde os <li data-nome data-partido> que não casam e as <section> que
// ficam vazias. Sem JS, a ilha hidrata inerte e a lista completa permanece
// visível (baseline SSG preservado). Usa style.display inline (vence utilities
// Tailwind no <section>/<li>, evita conflito com display utilities do Card).

const INPUT_CLASS =
  'min-h-[44px] rounded-md border border-line-emphasis bg-surface-canvas px-2 py-1.5 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

interface Props {
  children: ReactNode
  /** Siglas de partido distintas (ordenadas) para o select. */
  partidos: string[]
}

export function ParlamentarFilter({ children, partidos }: Props) {
  const [q, setQ] = useState('')
  const [partido, setPartido] = useState('')
  const [vazio, setVazio] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = wrapRef.current
    if (!root) return

    const nq = normalize(q)
    const items = root.querySelectorAll<HTMLLIElement>('li[data-nome]')
    let visiveis = 0
    for (const li of items) {
      const nome = normalize(li.dataset.nome ?? '')
      const part = (li.dataset.partido ?? '').toUpperCase()
      const match =
        (nq === '' || nome.includes(nq)) && (partido === '' || part === partido)
      li.style.display = match ? '' : 'none'
      if (match) visiveis++
    }

    // Esconde uma casa inteira quando todos os seus cards sumiram.
    for (const sec of root.querySelectorAll<HTMLElement>('section')) {
      const its = sec.querySelectorAll<HTMLLIElement>('li[data-nome]')
      if (its.length === 0) continue
      const algumVisivel = Array.from(its).some(
        (li) => li.style.display !== 'none',
      )
      sec.style.display = algumVisivel ? '' : 'none'
    }

    setVazio(items.length > 0 && visiveis === 0)
  }, [q, partido])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-fg-tertiary text-xs" htmlFor="filtro-rep-nome">
            Buscar por nome
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="-translate-y-1/2 absolute top-1/2 left-2 h-4 w-4 text-fg-tertiary"
            />
            <input
              autoComplete="off"
              className={`${INPUT_CLASS} w-full pl-8`}
              id="filtro-rep-nome"
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex: Maria, Silva…"
              type="search"
              value={q}
            />
          </div>
        </div>

        {partidos.length > 1 ? (
          <div className="flex flex-col gap-1">
            <label
              className="text-fg-tertiary text-xs"
              htmlFor="filtro-rep-partido"
            >
              Partido
            </label>
            <select
              className={INPUT_CLASS}
              id="filtro-rep-partido"
              onChange={(e) => setPartido(e.target.value)}
              value={partido}
            >
              <option value="">Todos os partidos</option>
              {partidos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="space-y-8" ref={wrapRef}>
        {children}
        {vazio ? (
          <p className="text-fg-tertiary text-sm" role="status">
            Nenhum parlamentar encontrado para o filtro.
          </p>
        ) : null}
      </div>
    </div>
  )
}
