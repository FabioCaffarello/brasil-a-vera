import Link from 'next/link'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { formatDataBR, getTipoVotoStyle } from '@/lib/format'
import type {
  VotosAlinhamentoFilter,
  VotosPeriodoFilter,
} from '@/lib/queries/parlamentares'

interface Voto {
  voto: string
  votacaoId: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
}

export interface VotosRecentesFiltros {
  periodo: VotosPeriodoFilter
  alinhamento: VotosAlinhamentoFilter
}

interface Props {
  votos: Voto[]
  filtros: VotosRecentesFiltros
  /**
   * Constrói o href trocando apenas o filtro especificado, preservando
   * os demais filtros mini de votos. Recebe `null` para resetar.
   * Caller (page) implementa para acoplar com URL global.
   */
  buildFiltroHref: (
    overrides: Partial<Record<keyof VotosRecentesFiltros, string | null>>,
  ) => string
  /** Href para "Mostrar mais" (?votos_after=…#votos). Null se não há mais. */
  proximaPaginaHref: string | null
}

const PERIODO_LABEL: Record<VotosPeriodoFilter, string> = {
  all: 'Tudo',
  '30d': '30 dias',
  '90d': '90 dias',
  '12m': '12 meses',
}

const ALINHAMENTO_LABEL: Record<VotosAlinhamentoFilter, string> = {
  todos: 'Todos',
  alinhado: 'Alinhado',
  divergente: 'Divergente',
}

// Sprint 4.3 PR 2 commit 1/4 — refatorado para tokens semânticos.
// Wave 7 Sprint 7.3 PR1 — ganha filtros mini (período + alinhamento) e
// link "Mostrar mais" para cursor pagination (ADR-026). Filtros via
// chips Link SSR (sem JS); cursor expand via anchor puro `<a href>`.
export function VotosRecentes({
  votos,
  filtros,
  buildFiltroHref,
  proximaPaginaHref,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <FilterChips label="Período">
          {(['all', '30d', '90d', '12m'] as VotosPeriodoFilter[]).map((p) => (
            <FilterChip asChild key={p} selected={filtros.periodo === p}>
              <Link
                href={buildFiltroHref({
                  periodo: p === 'all' ? null : p,
                })}
              >
                {PERIODO_LABEL[p]}
              </Link>
            </FilterChip>
          ))}
        </FilterChips>

        <FilterChips label="Alinhamento">
          {(
            ['todos', 'alinhado', 'divergente'] as VotosAlinhamentoFilter[]
          ).map((a) => (
            <FilterChip asChild key={a} selected={filtros.alinhamento === a}>
              <Link
                href={buildFiltroHref({
                  alinhamento: a === 'todos' ? null : a,
                })}
              >
                {ALINHAMENTO_LABEL[a]}
              </Link>
            </FilterChip>
          ))}
        </FilterChips>
      </div>

      {votos.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          Sem votos nominais para os filtros selecionados.
        </p>
      ) : (
        <ul className="space-y-3">
          {votos.map((v) => {
            const style = getTipoVotoStyle(v.voto)
            return (
              <li
                className="rounded-lg border border-border p-3"
                key={v.votacaoId}
              >
                <div className="flex flex-wrap items-center gap-2 text-foreground-muted text-xs">
                  <span>{formatDataBR(v.dataHora)}</span>
                  <span aria-hidden>·</span>
                  <span>{v.orgao}</span>
                  <span aria-hidden>·</span>
                  <span>
                    Resultado:{' '}
                    <span className="font-medium">
                      {v.aprovada ? 'aprovada' : 'rejeitada'}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 flex items-start gap-3">
                  <span
                    className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 font-semibold text-xs ${style.classes}`}
                  >
                    {style.label}
                  </span>
                  <p className="text-foreground text-sm">{v.descricao}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {proximaPaginaHref ? (
        <a
          className="block w-full rounded-md border border-border-strong bg-background py-2 text-center font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={proximaPaginaHref}
        >
          Mostrar mais
        </a>
      ) : null}
    </div>
  )
}
