// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { Chip, FilterChips } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'
import { VotosPorPartido } from '@/components/votacao/votos-por-partido'
import { formatDataBR } from '@/lib/format'
import type {
  VotacoesCasaFiltro,
  VotacoesResultadoFiltro,
} from '@/lib/queries/proposicoes'
import type { ResumoPorPartido } from '@/lib/queries/votacoes'

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
  /** Mapa votacaoId → resumo por partido. Quando presente, exibe breakout
   * por bancada dentro de cada card de votação. */
  porPartidoMap?: Record<string, ResumoPorPartido[]>
  /** Filtros mini (resultado + casa). Quando filtros e buildFiltroHref
   * estão presentes, a UI renderiza FilterChips no topo. */
  resultado?: VotacoesResultadoFiltro
  casa?: VotacoesCasaFiltro
  buildFiltroHref?: (override: {
    resultado?: VotacoesResultadoFiltro
    casa?: VotacoesCasaFiltro
  }) => string
}

export function VotacoesVinculadas({
  votacoes,
  porPartidoMap,
  resultado,
  casa,
  buildFiltroHref,
}: Props) {
  const mostrarFiltros =
    resultado !== undefined &&
    casa !== undefined &&
    buildFiltroHref !== undefined

  // Empty state distingue cenários (P2 — honestidade).
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
        <p className="text-fg-tertiary text-sm">
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
        {votacoes.map((v) => {
          const porPartido = porPartidoMap?.[v.id]
          return (
            <li
              className="rounded-lg border border-line-default p-3"
              key={v.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-fg-tertiary text-xs">
                <span>{formatDataBR(v.dataHora)}</span>
                <span aria-hidden>·</span>
                <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
                <span aria-hidden>·</span>
                <span>{v.orgao}</span>
                <span aria-hidden>·</span>
                <span
                  className={
                    v.aprovada
                      ? 'font-medium text-fg-success'
                      : 'font-medium text-fg-error'
                  }
                >
                  {v.aprovada ? 'Aprovada' : 'Rejeitada'}
                </span>
              </div>
              <p className="mt-1.5 text-fg-primary text-sm">{v.descricao}</p>
              {(v.votosSim > 0 || v.votosNao > 0) && (
                <p className="mt-1 tabular-nums text-fg-tertiary text-xs">
                  Sim: {v.votosSim} · Não: {v.votosNao}
                </p>
              )}
              {porPartido && porPartido.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer select-none text-fg-tertiary text-xs hover:text-fg-secondary">
                    Ver voto por bancada ({porPartido.length} partidos)
                  </summary>
                  <div className="mt-2">
                    <VotosPorPartido porPartido={porPartido} />
                  </div>
                </details>
              )}
            </li>
          )
        })}
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
        <Chip asChild selected={resultado === 'todos'}>
          <Link href={buildFiltroHref({ resultado: 'todos' })}>Todas</Link>
        </Chip>
        <Chip asChild selected={resultado === 'aprovadas'}>
          <Link href={buildFiltroHref({ resultado: 'aprovadas' })}>
            Aprovadas
          </Link>
        </Chip>
        <Chip asChild selected={resultado === 'rejeitadas'}>
          <Link href={buildFiltroHref({ resultado: 'rejeitadas' })}>
            Rejeitadas
          </Link>
        </Chip>
      </FilterChips>
      <FilterChips label="Casa">
        <Chip asChild selected={casa === 'todas'}>
          <Link href={buildFiltroHref({ casa: 'todas' })}>Todas</Link>
        </Chip>
        <Chip asChild selected={casa === 'CAMARA'}>
          <Link href={buildFiltroHref({ casa: 'CAMARA' })}>Câmara</Link>
        </Chip>
        <Chip asChild selected={casa === 'SENADO'}>
          <Link href={buildFiltroHref({ casa: 'SENADO' })}>Senado</Link>
        </Chip>
      </FilterChips>
    </div>
  )
}
