// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import {
  Chip,
  FilterChips,
  Timeline,
} from '@fabio.caffarello/react-design-system/server'
import { ArrowDown } from 'lucide-react'
import Link from 'next/link'
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
  /** Link para próxima página de tramitação. Null quando não há mais
   * eventos OU quando a primeira página já cobriu tudo (ADR-026). */
  mostrarMaisHref?: string | null
  /** Total de eventos restantes. Quando conhecido, exibido como
   * "Mostrar mais (N restantes)". */
  restantes?: number | null
  /** Filtro corrente ('todos' | 'marcos'). Quando passado, a UI
   * renderiza FilterChips para alternar. */
  filtro?: TramitacaoFiltro
  /** Builder de href que reseta o cursor ao trocar filtro. */
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
  // de marcos sem casamento". Honestidade P2.
  if (eventos.length === 0) {
    return (
      <div className="space-y-4">
        {mostrarFiltros ? (
          <FilterChipsHeader
            filtro={filtro}
            buildFiltroHref={buildFiltroHref}
          />
        ) : null}
        <p className="text-fg-tertiary text-sm">
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
      <Timeline
        items={eventos.map((e) => ({
          id: e.id,
          timestamp: formatDataBR(e.data),
          title: e.descricaoResumida,
          description: e.situacaoResultante
            ? `${e.orgao} · ${e.situacaoResultante}`
            : e.orgao,
          content: e.descricaoCompleta ? (
            <details>
              <summary className="cursor-pointer text-fg-tertiary text-xs hover:text-fg-primary">
                Ver despacho completo
              </summary>
              <p className="mt-1.5 whitespace-pre-line text-fg-primary text-sm">
                {e.descricaoCompleta}
              </p>
            </details>
          ) : undefined,
        }))}
        orientation="vertical"
      />

      {/* Cursor pagination: link <a> puro com anchor #tramitacao mantém
          o scroll na seção após paginar (ADR-026 §4). Sem JS. */}
      {mostrarMaisHref ? (
        <div className="flex justify-center pt-2">
          <a
            className="inline-flex items-center gap-2 rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
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
      <Chip asChild selected={filtro === 'todos'}>
        <Link href={buildFiltroHref('todos')}>Tudo</Link>
      </Chip>
      <Chip asChild selected={filtro === 'marcos'}>
        <Link href={buildFiltroHref('marcos')}>Marcos importantes</Link>
      </Chip>
    </FilterChips>
  )
}
