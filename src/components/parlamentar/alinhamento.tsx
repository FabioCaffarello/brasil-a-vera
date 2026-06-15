// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type { AlinhamentoResult } from '@/lib/queries/alinhamento'
import type { AlinhamentoMensalPoint } from '@/lib/queries/parlamentares'
import { ALINHAMENTO_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/alinhamento'

interface Props {
  alinhamento: AlinhamentoResult
  casa: 'CAMARA' | 'SENADO'
  /** Série mensal dos últimos 12 meses. Vazio = sparkline não renderiza. */
  mensal?: AlinhamentoMensalPoint[]
}

function VotacaoLink({
  votacaoId,
  descricao,
}: {
  votacaoId: string
  descricao: string
}) {
  return (
    <Link
      className="text-fg-primary hover:text-fg-tertiary hover:underline"
      href={`/votacoes/${votacaoId}`}
    >
      {descricao}
    </Link>
  )
}

// Sparkline SVG inline 12m. Sem JS, sem libs — 1 path + N círculos com
// <title> para tooltip nativo do browser. Layout fixo 240x44 px.
function Sparkline12m({ data }: { data: AlinhamentoMensalPoint[] }) {
  const points = data.filter(
    (d): d is AlinhamentoMensalPoint & { percentual: number } =>
      d.percentual !== null,
  )
  if (points.length < 2) return null

  const W = 240
  const H = 44
  const PAD_X = 6
  const PAD_Y = 6
  const innerW = W - 2 * PAD_X
  const innerH = H - 2 * PAD_Y

  const xAt = (i: number) =>
    points.length === 1
      ? PAD_X + innerW / 2
      : PAD_X + (i / (points.length - 1)) * innerW
  // Escala linear 0-100 → topo-base (Y do SVG cresce pra baixo).
  const yAt = (pct: number) => PAD_Y + (1 - pct / 100) * innerH

  const pathD = points
    .map(
      (d, i) =>
        `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.percentual).toFixed(1)}`,
    )
    .join(' ')

  // Range vertical do dado (max-min) — sem auto-zoom no eixo Y (mantém
  // escala canônica 0-100 para comparações entre perfis).
  const min = Math.min(...points.map((d) => d.percentual))
  const max = Math.max(...points.map((d) => d.percentual))

  return (
    <div className="text-accent">
      <svg
        aria-label={`Sparkline ${points.length} meses — variando entre ${min}% e ${max}%`}
        className="block h-11 w-full max-w-60"
        height={H}
        role="img"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
      >
        {/* Linha 50% como referência visual (sutil). stroke via style inline:
            stroke- é overloaded (stroke-width) e o RDS não pré-compila
            stroke-<cor>; o bridge do @theme só gera utilities color-only
            (bg/border/ring). var() resolve no :root do RDS importado
            globalmente. Ver ADR-034 §limitação text-/stroke-. */}
        <line
          aria-hidden
          strokeDasharray="2 2"
          style={{ stroke: 'var(--color-line-default)' }}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={yAt(50)}
          y2={yAt(50)}
        />
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        {points.map((d, i) => (
          <g key={d.mes}>
            <circle
              className="fill-accent"
              cx={xAt(i)}
              cy={yAt(d.percentual)}
              r={2}
            />
            <title>
              {d.mes}: {d.percentual}% ({d.total} votação
              {d.total === 1 ? '' : 'es'})
            </title>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function AlinhamentoBancada({ alinhamento, casa, mensal = [] }: Props) {
  if (alinhamento.total === 0) {
    if (casa === 'SENADO') {
      return (
        <p className="text-fg-tertiary text-sm">
          O Senado não publica orientações de bancada em endpoint público (
          <a
            className="underline decoration-dotted underline-offset-2"
            href="https://github.com/FabioCaffarello/brasil-a-vera/issues/83"
            rel="noopener noreferrer"
            target="_blank"
          >
            #83
          </a>
          ). O alinhamento partidário não é calculável para senadores nesta
          versão.
        </p>
      )
    }
    return (
      <p className="text-fg-tertiary text-sm">
        Orientação partidária só é registrada em{' '}
        <strong>votações nominais</strong> (com voto individual de cada
        deputado) — e somente quando a liderança da bancada formaliza posição na
        API da Câmara. A liderança deste partido ainda não publicou orientação
        em nenhuma das votações nominais ingeridas. Nem todos os partidos
        formalizam orientação em toda votação; a cobertura cresce a cada
        execução do cron (4×/dia) conforme novas votações nominais e novas
        orientações entrarem.
      </p>
    )
  }

  const percentColor =
    alinhamento.percentual === null
      ? 'text-fg-tertiary'
      : alinhamento.percentual >= 80
        ? 'text-fg-success'
        : alinhamento.percentual >= 50
          ? 'text-fg-primary'
          : 'text-fg-warning'

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold text-3xl tabular-nums ${percentColor}`}>
          {alinhamento.percentual}%
        </span>
        <span className="text-fg-tertiary text-sm">
          alinhado ao {alinhamento.partidoSigla}
        </span>
      </div>
      <p className="text-fg-tertiary text-xs">
        {alinhamento.alinhados} alinhadas e {alinhamento.divergentes}{' '}
        divergentes, em {alinhamento.total} votações com orientação da bancada.
        Votos AUSENTE e orientações LIBERADO não entram no cálculo.
      </p>

      {mensal.length >= 2 ? (
        <div>
          <p className="mb-1.5 text-fg-tertiary text-xs uppercase tracking-wider">
            Variação mensal (últimos {mensal.length} meses)
          </p>
          <Sparkline12m data={mensal} />
        </div>
      ) : null}
      {alinhamento.amostraInsuficiente && (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-fg-warning text-xs">
          Amostra pequena (menos de {ALINHAMENTO_AMOSTRA_MINIMA} votações). O
          percentual é informativo mas estatisticamente frágil.
        </p>
      )}

      {alinhamento.topDivergencias.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
            Top {alinhamento.topDivergencias.length} divergiu da bancada
          </h3>
          <ul className="space-y-1.5">
            {alinhamento.topDivergencias.map((v) => (
              <li className="text-fg-primary text-sm" key={v.votacaoId}>
                <span className="tabular-nums text-fg-tertiary text-xs">
                  {formatDataBR(v.dataHora)}
                </span>{' '}
                —{' '}
                <VotacaoLink votacaoId={v.votacaoId} descricao={v.descricao} />{' '}
                <span className="text-fg-tertiary text-xs">
                  (votou {v.voto}, bancada {v.orientacao})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alinhamento.topConvergencias.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
            Top {alinhamento.topConvergencias.length} convergiu com a bancada
          </h3>
          <ul className="space-y-1.5">
            {alinhamento.topConvergencias.map((v) => (
              <li className="text-fg-primary text-sm" key={v.votacaoId}>
                <span className="tabular-nums text-fg-tertiary text-xs">
                  {formatDataBR(v.dataHora)}
                </span>{' '}
                —{' '}
                <VotacaoLink votacaoId={v.votacaoId} descricao={v.descricao} />{' '}
                <span className="text-fg-tertiary text-xs">({v.voto})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
