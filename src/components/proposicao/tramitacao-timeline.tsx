import { ArrowDown } from 'lucide-react'
import Link from 'next/link'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { formatDataBR } from '@/lib/format'
import type { TramitacaoFiltro } from '@/lib/queries/proposicoes'

interface Evento {
  id: string
  data: Date | string
  orgao: string
  descricaoResumida: string
  descricaoCompleta: string | null
  situacaoResultante: string | null
}

interface Props {
  eventos: Evento[]
  /** Wave 8 Sprint 8.3 PR1 — link para próxima página de tramitação.
   * Null quando não há mais eventos OU quando a primeira página já
   * cobriu tudo (cursor pagination ADR-026). */
  mostrarMaisHref?: string | null
  /** Total de eventos restantes (sem incluir os já mostrados). Quando
   * conhecido, exibido como "Mostrar mais (N restantes)". Quando null,
   * apenas "Mostrar mais". */
  restantes?: number | null
  /** Wave 8 Sprint 8.3 PR2 — filtro corrente ('todos' | 'marcos').
   * Quando passado, a UI renderiza FilterChips para alternar. Caller
   * gera os hrefs via `buildFiltroHref` (URL state). */
  filtro?: TramitacaoFiltro
  /** Builder de href que recebe o filtro de destino e retorna URL
   * que reseta o cursor (para não pular eventos ao trocar filtro).
   * Quando ausente, FilterChips não renderiza. */
  buildFiltroHref?: (filtro: TramitacaoFiltro) => string
}

export function TramitacaoTimeline({
  eventos,
  mostrarMaisHref,
  restantes,
  filtro,
  buildFiltroHref,
}: Props) {
  const mostrarFiltros = filtro !== undefined && buildFiltroHref !== undefined

  // Empty state: distingue entre "proposição sem tramitação" e "filtro
  // de marcos sem casamento". Honestidade P2 — não dizer "nenhum marco"
  // quando a base não tem dado ainda.
  if (eventos.length === 0) {
    return (
      <div className="space-y-4">
        {mostrarFiltros ? (
          <FilterChipsHeader
            filtro={filtro}
            buildFiltroHref={buildFiltroHref}
          />
        ) : null}
        <p className="text-foreground-muted text-sm">
          {filtro === 'marcos'
            ? 'Nenhum marco importante registrado entre os eventos desta proposição. Mude para "Tudo" para ver a tramitação completa.'
            : 'Nenhum evento de tramitação ingerido para esta proposição. A coleta de tramitação é semanal (domingo 03:00 UTC) e cobre apenas proposições com movimentação registrada na fonte oficial.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {mostrarFiltros ? (
        <FilterChipsHeader filtro={filtro} buildFiltroHref={buildFiltroHref} />
      ) : null}
      <ol className="relative space-y-3 border-border border-l-2 pl-5">
        {eventos.map((e) => (
          <li className="relative" key={e.id}>
            <span
              aria-hidden
              className="-left-[26px] absolute top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-surface"
            />
            <div className="flex flex-wrap items-center gap-2 text-foreground-muted text-xs">
              <span className="font-medium tabular-nums">
                {formatDataBR(e.data)}
              </span>
              <span aria-hidden>·</span>
              <span>{e.orgao}</span>
              {e.situacaoResultante && (
                <>
                  <span aria-hidden>·</span>
                  <span className="italic">{e.situacaoResultante}</span>
                </>
              )}
            </div>
            <p className="mt-1 text-foreground text-sm">
              {e.descricaoResumida}
            </p>
            {e.descricaoCompleta && (
              <details className="mt-1">
                <summary className="cursor-pointer text-foreground-muted text-xs hover:text-foreground">
                  Ver despacho completo
                </summary>
                <p className="mt-1.5 whitespace-pre-line text-foreground text-sm">
                  {e.descricaoCompleta}
                </p>
              </details>
            )}
          </li>
        ))}
      </ol>

      {/* Cursor pagination: link <a> puro com anchor #tramitacao mantém
          o scroll na seção após paginar (ADR-026 §4). Sem JS. */}
      {mostrarMaisHref ? (
        <div className="flex justify-center pt-2">
          <a
            className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-background px-3 py-2 font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={mostrarMaisHref}
          >
            <ArrowDown aria-hidden className="h-3.5 w-3.5" />
            {typeof restantes === 'number' && restantes > 0
              ? `Mostrar mais (${restantes} ${restantes === 1 ? 'restante' : 'restantes'})`
              : 'Mostrar mais'}
          </a>
        </div>
      ) : null}
    </div>
  )
}

function FilterChipsHeader({
  filtro,
  buildFiltroHref,
}: {
  filtro: TramitacaoFiltro
  buildFiltroHref: (filtro: TramitacaoFiltro) => string
}) {
  return (
    <FilterChips label="Eventos">
      <FilterChip asChild selected={filtro === 'todos'}>
        <Link href={buildFiltroHref('todos')}>Tudo</Link>
      </FilterChip>
      <FilterChip asChild selected={filtro === 'marcos'}>
        <Link href={buildFiltroHref('marcos')}>Marcos importantes</Link>
      </FilterChip>
    </FilterChips>
  )
}
