'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { getTipoVotoStyle } from '@/lib/format'
import type { VotoIndividual } from '@/lib/queries/votacoes'

interface Props {
  /** Lista completa de votos (sem filtro). Cardinalidade finita pequena
   * (~513 deputados ou ~81 senadores) cabe em memória cliente sem
   * impacto perceptível de payload. */
  votos: VotoIndividual[]
  votacaoId: string
}

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'SIM', label: 'SIM' },
  { value: 'NAO', label: 'NÃO' },
  { value: 'ABSTENCAO', label: 'Abstenção' },
  { value: 'AUSENTE', label: 'Ausente' },
  { value: 'OBSTRUCAO', label: 'Obstrução' },
]

// Wave 9 Sprint 9.2 PR1 (D7) — filtro migrou de server-side query para
// client-side filter in-memory. Justificativa: lista é finita pequena,
// roundtrip de filtro novo via servidor não valia opt-out de SSG. Página
// agora é estática (SSG + ISR) com filtro reativo via useSearchParams.
//
// Links dos pills continuam server-routed (preservam shareable URL +
// SEO + back/forward histórico do navegador). useSearchParams reage à
// mudança sem trigger novo SSR.
export function VotosIndividuais({ votos, votacaoId }: Props) {
  const searchParams = useSearchParams()
  const filtroAtual = searchParams.get('voto') ?? ''

  const votosFiltrados = useMemo(() => {
    if (!filtroAtual) return votos
    return votos.filter((v) => v.voto === filtroAtual)
  }, [votos, filtroAtual])

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
          const href = t.value
            ? `/votacoes/${votacaoId}?voto=${t.value}`
            : `/votacoes/${votacaoId}`
          return (
            <Link
              className={
                isAtivo
                  ? 'rounded bg-foreground px-2.5 py-1 font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  : 'rounded border border-border-strong px-2.5 py-1 text-foreground hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              }
              href={href}
              key={t.value}
              scroll={false}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>

      {votosFiltrados.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          {filtroAtual
            ? 'Nenhum voto deste tipo registrado nesta votação.'
            : 'Sem votos individuais.'}
        </p>
      ) : (
        <>
          <p className="mb-2 text-foreground-muted text-xs">
            {votosFiltrados.length}
            {showCounter && ` de ${totalSemFiltro}`} voto
            {votosFiltrados.length === 1 ? '' : 's'}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {votosFiltrados.map((v) => {
              const style = getTipoVotoStyle(v.voto)
              return (
                <li
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-elevated"
                  key={v.id}
                >
                  <Link
                    className="min-w-0 flex-1 truncate rounded text-foreground underline decoration-dotted underline-offset-2 hover:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    href={`/parlamentares/${v.parlamentarId}`}
                  >
                    {v.parlamentarNome}
                  </Link>
                  <span className="shrink-0 text-foreground-muted text-xs">
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
