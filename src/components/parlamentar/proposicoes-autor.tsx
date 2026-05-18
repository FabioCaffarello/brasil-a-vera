import Link from 'next/link'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { formatProposicaoRef } from '@/lib/format'
import type {
  ProposicaoSituacaoFilter,
  ProposicaoTipoFilter,
} from '@/lib/queries/parlamentares'

interface Proposicao {
  proposicaoId: string
  tipo: string
  numero: number
  ano: number
  ementa: string
  situacao: string
  tipoAutoria: string
}

export interface ProposicoesAutorFiltros {
  tipo: ProposicaoTipoFilter
  situacao: ProposicaoSituacaoFilter
}

interface Props {
  proposicoes: Proposicao[]
  filtros: ProposicoesAutorFiltros
  /**
   * Mesma assinatura do VotosRecentes: troca um filtro mantendo os
   * demais (`null` para reset). Caller (page) acopla com URL.
   */
  buildFiltroHref: (
    overrides: Partial<Record<keyof ProposicoesAutorFiltros, string | null>>,
  ) => string
  /** Href para "Mostrar mais" (?propos_after=…#proposicoes). Null se acabou. */
  proximaPaginaHref: string | null
}

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

const TIPO_LABEL: Record<ProposicaoTipoFilter, string> = {
  todos: 'Todos',
  PL: 'PL',
  PEC: 'PEC',
  PLP: 'PLP',
  MPV: 'MPV',
  PDC: 'PDC',
  PRC: 'PRC',
}

const SITUACAO_FILTER_LABEL: Record<ProposicaoSituacaoFilter, string> = {
  todas: 'Todas',
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovadas',
  REJEITADA: 'Rejeitadas',
  ARQUIVADA: 'Arquivadas',
  TRANSFORMADA_EM_NORMA: 'Viraram norma',
}

// Sprint 4.3 PR 2 commit 3/4 — refatorado para tokens semânticos.
// Wave 7 Sprint 7.3 PR3 — ganha filtros mini (tipo + situação) e link
// "Mostrar mais" para cursor pagination (ADR-026). Filtros via chips
// Link SSR (sem JS); cursor expand via anchor puro `<a href>` com
// #proposicoes para scroll-restoration.
export function ProposicoesAutor({
  proposicoes,
  filtros,
  buildFiltroHref,
  proximaPaginaHref,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <FilterChips label="Tipo">
          {(Object.keys(TIPO_LABEL) as ProposicaoTipoFilter[]).map((t) => (
            <FilterChip asChild key={t} selected={filtros.tipo === t}>
              <Link
                href={buildFiltroHref({
                  tipo: t === 'todos' ? null : t,
                })}
              >
                {TIPO_LABEL[t]}
              </Link>
            </FilterChip>
          ))}
        </FilterChips>

        <FilterChips label="Situação">
          {(
            Object.keys(SITUACAO_FILTER_LABEL) as ProposicaoSituacaoFilter[]
          ).map((s) => (
            <FilterChip asChild key={s} selected={filtros.situacao === s}>
              <Link
                href={buildFiltroHref({
                  situacao: s === 'todas' ? null : s,
                })}
              >
                {SITUACAO_FILTER_LABEL[s]}
              </Link>
            </FilterChip>
          ))}
        </FilterChips>
      </div>

      {proposicoes.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          Sem proposições para os filtros selecionados.
        </p>
      ) : (
        <ul className="space-y-3">
          {proposicoes.map((p) => (
            <li
              className="rounded-lg border border-border p-3"
              key={p.proposicaoId}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-foreground-muted text-xs">
                <span className="font-medium font-mono text-foreground">
                  {formatProposicaoRef(p.tipo, p.numero, p.ano)}
                </span>
                <span className="flex items-center gap-2">
                  <span>{p.tipoAutoria === 'AUTOR' ? 'Autor' : 'Coautor'}</span>
                  <span aria-hidden>·</span>
                  <span>{SITUACAO_LABELS[p.situacao] ?? p.situacao}</span>
                </span>
              </div>
              <p className="mt-1.5 text-foreground text-sm">{p.ementa}</p>
            </li>
          ))}
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
