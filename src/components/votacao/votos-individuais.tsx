'use client'

// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.
// Filtro client-side por estado local (D7, ADR-052): a lista vive dentro do
// VotosDrawer, então o filtro deixou de ser ?voto= na URL e passou a useState.
// `initialFiltro` semeia o estado uma vez (deep-link /votacoes/[id]?voto=X que
// o drawer lê no mount). pill invertido usa text-fg-inverse; getTipoVotoStyle
// traduzido na Fase B.

import Link from 'next/link'
import { useState } from 'react'

import { getTipoVotoStyle } from '@/lib/format'
import type { VotoIndividual } from '@/lib/queries/votacoes'

interface Props {
  /** Lista completa de votos (sem filtro). Cardinalidade finita pequena
   * (~513 deputados ou ~81 senadores) cabe em memória cliente sem
   * impacto perceptível de payload. */
  votos: VotoIndividual[]
  /** Filtro inicial (deep-link semeado pelo drawer). '' = todos. */
  initialFiltro?: string
}

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'SIM', label: 'SIM' },
  { value: 'NAO', label: 'NÃO' },
  { value: 'ABSTENCAO', label: 'Abstenção' },
  { value: 'AUSENTE', label: 'Ausente' },
  { value: 'OBSTRUCAO', label: 'Obstrução' },
]

export function VotosIndividuais({ votos, initialFiltro = '' }: Props) {
  const [filtroAtual, setFiltroAtual] = useState(initialFiltro)

  const votosFiltrados = filtroAtual
    ? votos.filter((v) => v.voto === filtroAtual)
    : votos

  const totalSemFiltro = votos.length
  const showCounter = filtroAtual && votosFiltrados.length !== totalSemFiltro

  return (
    <div>
      <nav
        aria-label="Filtrar por voto"
        className="mb-3 flex flex-wrap gap-1.5 text-xs"
      >
        {TIPOS.map((t) => {
          const isAtivo = filtroAtual === t.value
          return (
            <button
              aria-pressed={isAtivo}
              className={
                isAtivo
                  ? // Pill invertido — extensão piloto-4 do token-map
                    // (aprovada pelo owner, CP3). text-fg-inverse (não
                    // text-surface-canvas): o RDS pré-compila text-fg-* mas
                    // NÃO text-surface-* (text- é overloaded com font-size;
                    // o bridge do @theme só gera utilities color-only —
                    // bg/border/ring. Ver ADR-034 §limitação text-/stroke-).
                    'rounded bg-fg-primary px-2.5 py-1 font-medium text-fg-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'
                  : 'rounded border border-line-emphasis px-2.5 py-1 text-fg-primary hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'
              }
              key={t.value}
              onClick={() => setFiltroAtual(t.value)}
              type="button"
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {votosFiltrados.length === 0 ? (
        <p className="text-fg-tertiary text-sm">
          {filtroAtual
            ? 'Nenhum voto deste tipo registrado nesta votação.'
            : 'Sem votos individuais.'}
        </p>
      ) : (
        <>
          <p className="mb-2 text-fg-tertiary text-xs">
            {votosFiltrados.length}
            {showCounter && ` de ${totalSemFiltro}`} voto
            {votosFiltrados.length === 1 ? '' : 's'}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {votosFiltrados.map((v) => {
              const style = getTipoVotoStyle(v.voto)
              return (
                <li
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-raised"
                  key={v.id}
                >
                  <Link
                    className="min-w-0 flex-1 truncate rounded text-fg-primary underline decoration-dotted underline-offset-2 hover:text-fg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                    href={`/parlamentares/${v.parlamentarId}`}
                  >
                    {v.parlamentarNome}
                  </Link>
                  <span className="shrink-0 text-fg-tertiary text-xs">
                    {v.parlamentarPartidoSigla}/{v.parlamentarUf}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 font-medium text-xs ${style.classes}`}
                  >
                    {style.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
