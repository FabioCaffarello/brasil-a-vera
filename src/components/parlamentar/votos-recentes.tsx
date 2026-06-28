// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { Chip, FilterChips } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'
import { formatDataBR, getTipoVotoStyle } from '@/lib/format'
import type {
  VotosAlinhamentoFilter,
  VotosDistribuicao,
  VotosPeriodoFilter,
} from '@/lib/queries/parlamentares'

interface Voto {
  voto: string
  votacaoId: string
  dataHora: Date | string
  descricao: string
  orgao: string
  aprovada: boolean
  proposicaoTipo?: string | null
  proposicaoNumero?: number | null
  proposicaoAno?: number | null
  orientacao?: string | null
}

const ORIENTACAO_LABEL: Record<string, string> = {
  SIM: 'SIM',
  NAO: 'NÃO',
  ABSTENCAO: 'Abs.',
  OBSTRUCAO: 'Obstr.',
  LIBERADO: 'Livre',
}

export interface VotosRecentesFiltros {
  periodo: VotosPeriodoFilter
  alinhamento: VotosAlinhamentoFilter
}

interface Props {
  votos: Voto[]
  filtros: VotosRecentesFiltros
  /** Distribuição agregada dos votos (mesmos filtros aplicados). */
  distribuicao: VotosDistribuicao
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

export function VotosRecentes({
  votos,
  filtros,
  distribuicao,
  buildFiltroHref,
  proximaPaginaHref,
}: Props) {
  return (
    <div className="space-y-3">
      <DistribuicaoBar distribuicao={distribuicao} />
      <div className="space-y-2">
        <FilterChips label="Período">
          {(['all', '30d', '90d', '12m'] as VotosPeriodoFilter[]).map((p) => (
            <Chip asChild key={p} selected={filtros.periodo === p}>
              <Link
                href={buildFiltroHref({
                  periodo: p === 'all' ? null : p,
                })}
              >
                {PERIODO_LABEL[p]}
              </Link>
            </Chip>
          ))}
        </FilterChips>

        <FilterChips label="Alinhamento">
          {(
            ['todos', 'alinhado', 'divergente'] as VotosAlinhamentoFilter[]
          ).map((a) => (
            <Chip asChild key={a} selected={filtros.alinhamento === a}>
              <Link
                href={buildFiltroHref({
                  alinhamento: a === 'todos' ? null : a,
                })}
              >
                {ALINHAMENTO_LABEL[a]}
              </Link>
            </Chip>
          ))}
        </FilterChips>
      </div>

      {votos.length === 0 ? (
        <p className="text-fg-tertiary text-sm">
          Sem votos nominais para os filtros selecionados.
        </p>
      ) : (
        <ul className="space-y-3">
          {votos.map((v) => {
            const style = getTipoVotoStyle(v.voto)
            return (
              <li
                className="rounded-lg border border-line-default p-3"
                key={v.votacaoId}
              >
                <div className="flex flex-wrap items-center gap-2 text-fg-tertiary text-xs">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <Link
                        className="text-fg-primary decoration-dotted underline-offset-2 hover:text-fg-tertiary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                        href={`/votacoes/${v.votacaoId}`}
                      >
                        {v.descricao}
                      </Link>
                    </p>
                    {v.proposicaoTipo &&
                    v.proposicaoNumero &&
                    v.proposicaoAno ? (
                      <Link
                        className="mt-0.5 inline-block text-fg-tertiary text-xs decoration-dotted underline-offset-2 hover:text-fg-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                        href={`/proposicoes/${v.proposicaoTipo}/${v.proposicaoNumero}/${v.proposicaoAno}`}
                      >
                        {v.proposicaoTipo} {v.proposicaoNumero}/
                        {v.proposicaoAno} →
                      </Link>
                    ) : null}
                    {v.orientacao ? (
                      <span className="mt-0.5 block text-fg-quaternary text-xs">
                        bancada:{' '}
                        {ORIENTACAO_LABEL[v.orientacao] ?? v.orientacao}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {proximaPaginaHref ? (
        // id ancora o próprio "Mostrar mais" — o href aponta para esse
        // mesmo id, garantindo que após carregar a próxima página o
        // navegador rola até o NOVO botão (que está no mesmo offset
        // visual). Usuário continua perto de onde estava em vez de
        // saltar para o topo da seção.
        <a
          className="block w-full rounded-md border border-line-emphasis bg-surface-canvas py-2 text-center font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href={proximaPaginaHref}
          id="mostrar-mais-votos"
        >
          Mostrar mais
        </a>
      ) : null}
    </div>
  )
}

// Barra de distribuição de voto — CSS-only, sem JS. 3 categorias
// (SIM/NÃO/Abstenção) a 30% de opacidade. AUSENTE e OBSTRUCAO entram
// no `total` para cálculo de % mas não renderizam segmento.
//
// Honestidade do dado: se total == 0 (sem votos no filtro), não
// renderiza nada — barra vazia seria visualmente confusa.
function DistribuicaoBar({
  distribuicao,
}: {
  distribuicao: VotosDistribuicao
}) {
  if (distribuicao.total === 0) return null

  const pct = (n: number) => Math.round((n / distribuicao.total) * 100)
  const pctSim = pct(distribuicao.sim)
  const pctNao = pct(distribuicao.nao)
  const pctAbs = pct(distribuicao.abstencao)

  return (
    <div>
      <div
        aria-hidden
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
      >
        {pctSim > 0 ? (
          <div
            className="h-full bg-success/30"
            style={{ width: `${pctSim}%` }}
          />
        ) : null}
        {pctNao > 0 ? (
          <div className="h-full bg-error/30" style={{ width: `${pctNao}%` }} />
        ) : null}
        {pctAbs > 0 ? (
          <div
            className="h-full bg-warning/30"
            style={{ width: `${pctAbs}%` }}
          />
        ) : null}
      </div>
      <p className="mt-1.5 text-fg-tertiary text-xs">
        <span className="font-medium text-fg-success">{pctSim}% SIM</span>
        {' · '}
        <span className="font-medium text-fg-error">{pctNao}% NÃO</span>
        {' · '}
        <span className="font-medium text-fg-warning">{pctAbs}% Abstenção</span>
        {distribuicao.ausente + distribuicao.obstrucao > 0 ? (
          <>
            {' · '}
            <span className="text-fg-quaternary">
              {pct(distribuicao.ausente + distribuicao.obstrucao)}% Ausência/
              Obstrução
            </span>
          </>
        ) : null}
      </p>
    </div>
  )
}
