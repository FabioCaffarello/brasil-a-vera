import Link from 'next/link'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { formatDataBR } from '@/lib/format'
import type {
  VotacoesCasaFiltro,
  VotacoesResultadoFiltro,
} from '@/lib/queries/proposicoes'

interface Votacao {
  id: string
  casa: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
  votosSim: number
  votosNao: number
}

interface Props {
  votacoes: Votacao[]
  /** Wave 8 Sprint 8.3 PR3 — filtros mini (resultado + casa). Quando
   * filtros e buildFiltroHref estão presentes, a UI renderiza
   * FilterChips no topo. Caller controla URL state. */
  resultado?: VotacoesResultadoFiltro
  casa?: VotacoesCasaFiltro
  buildFiltroHref?: (override: {
    resultado?: VotacoesResultadoFiltro
    casa?: VotacoesCasaFiltro
  }) => string
}

export function VotacoesVinculadas({
  votacoes,
  resultado,
  casa,
  buildFiltroHref,
}: Props) {
  const mostrarFiltros =
    resultado !== undefined &&
    casa !== undefined &&
    buildFiltroHref !== undefined

  // Empty state distingue cenários (P2 — honestidade):
  // - filtro=todos vazio: nenhuma votação vinculada na base
  // - filtro restritivo vazio: nenhuma votação CASA com esse filtro;
  //   sugere ampliar
  if (votacoes.length === 0) {
    const filtroAtivo =
      mostrarFiltros && (resultado !== 'todos' || casa !== 'todas')
    return (
      <div className="space-y-4">
        {mostrarFiltros ? (
          <FilterChipsHeader
            buildFiltroHref={buildFiltroHref}
            casa={casa}
            resultado={resultado}
          />
        ) : null}
        <p className="text-foreground-muted text-sm">
          {filtroAtivo
            ? 'Nenhuma votação corresponde aos filtros selecionados. Volte para "Todas" para ver todas as votações vinculadas.'
            : 'Nenhuma votação foi vinculada a esta proposição na base atual. Isso pode acontecer se a votação correspondente não foi ingerida, ou se ainda não houve votação registrada.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {mostrarFiltros ? (
        <FilterChipsHeader
          buildFiltroHref={buildFiltroHref}
          casa={casa}
          resultado={resultado}
        />
      ) : null}
      <ul className="space-y-3">
        {votacoes.map((v) => (
          <li className="rounded-lg border border-border p-3" key={v.id}>
            <div className="flex flex-wrap items-center gap-2 text-foreground-muted text-xs">
              <span>{formatDataBR(v.dataHora)}</span>
              <span aria-hidden>·</span>
              <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
              <span aria-hidden>·</span>
              <span>{v.orgao}</span>
              <span aria-hidden>·</span>
              <span
                className={
                  v.aprovada
                    ? 'font-medium text-success'
                    : 'font-medium text-destructive'
                }
              >
                {v.aprovada ? 'Aprovada' : 'Rejeitada'}
              </span>
            </div>
            <p className="mt-1.5 text-foreground text-sm">{v.descricao}</p>
            {(v.votosSim > 0 || v.votosNao > 0) && (
              <p className="mt-1 tabular-nums text-foreground-muted text-xs">
                Sim: {v.votosSim} · Não: {v.votosNao}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterChipsHeader({
  resultado,
  casa,
  buildFiltroHref,
}: {
  resultado: VotacoesResultadoFiltro
  casa: VotacoesCasaFiltro
  buildFiltroHref: (override: {
    resultado?: VotacoesResultadoFiltro
    casa?: VotacoesCasaFiltro
  }) => string
}) {
  return (
    <div className="space-y-3">
      <FilterChips label="Resultado">
        <FilterChip asChild selected={resultado === 'todos'}>
          <Link href={buildFiltroHref({ resultado: 'todos' })}>Todas</Link>
        </FilterChip>
        <FilterChip asChild selected={resultado === 'aprovadas'}>
          <Link href={buildFiltroHref({ resultado: 'aprovadas' })}>
            Aprovadas
          </Link>
        </FilterChip>
        <FilterChip asChild selected={resultado === 'rejeitadas'}>
          <Link href={buildFiltroHref({ resultado: 'rejeitadas' })}>
            Rejeitadas
          </Link>
        </FilterChip>
      </FilterChips>
      <FilterChips label="Casa">
        <FilterChip asChild selected={casa === 'todas'}>
          <Link href={buildFiltroHref({ casa: 'todas' })}>Todas</Link>
        </FilterChip>
        <FilterChip asChild selected={casa === 'CAMARA'}>
          <Link href={buildFiltroHref({ casa: 'CAMARA' })}>Câmara</Link>
        </FilterChip>
        <FilterChip asChild selected={casa === 'SENADO'}>
          <Link href={buildFiltroHref({ casa: 'SENADO' })}>Senado</Link>
        </FilterChip>
      </FilterChips>
    </div>
  )
}
