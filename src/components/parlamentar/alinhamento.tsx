import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type { AlinhamentoResult } from '@/lib/queries/alinhamento'
import { ALINHAMENTO_AMOSTRA_MINIMA } from '@/modules/parlamentares/domain/alinhamento'

interface Props {
  alinhamento: AlinhamentoResult
  casa: 'CAMARA' | 'SENADO'
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
      className="text-foreground hover:text-foreground-muted hover:underline"
      href={`/votacoes/${votacaoId}`}
    >
      {descricao}
    </Link>
  )
}

// Sprint 4.3 PR 2 commit 2/4 — refatorado para tokens semânticos.
// Limiares de cor do percentual de alinhamento (≥80 success; ≥50 neutro;
// <50 warning) preservam intenção semântica original (emerald/amber)
// agora em tokens.
export function AlinhamentoBancada({ alinhamento, casa }: Props) {
  if (alinhamento.total === 0) {
    if (casa === 'SENADO') {
      return (
        <p className="text-foreground-muted text-sm">
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
      <p className="text-foreground-muted text-sm">
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
      ? 'text-foreground-muted'
      : alinhamento.percentual >= 80
        ? 'text-success'
        : alinhamento.percentual >= 50
          ? 'text-foreground'
          : 'text-warning'

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold text-3xl tabular-nums ${percentColor}`}>
          {alinhamento.percentual}%
        </span>
        <span className="text-foreground-muted text-sm">
          alinhado ao {alinhamento.partidoSigla}
        </span>
      </div>
      <p className="text-foreground-muted text-xs">
        {alinhamento.alinhados} alinhadas e {alinhamento.divergentes}{' '}
        divergentes, em {alinhamento.total} votações com orientação da bancada.
        Votos AUSENTE e orientações LIBERADO não entram no cálculo.
      </p>
      {alinhamento.amostraInsuficiente && (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-warning text-xs">
          Amostra pequena (menos de {ALINHAMENTO_AMOSTRA_MINIMA} votações). O
          percentual é informativo mas estatisticamente frágil.
        </p>
      )}

      {alinhamento.topDivergencias.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-medium text-foreground-muted text-xs uppercase tracking-wide">
            Top {alinhamento.topDivergencias.length} divergiu da bancada
          </h3>
          <ul className="space-y-1.5">
            {alinhamento.topDivergencias.map((v) => (
              <li className="text-foreground text-sm" key={v.votacaoId}>
                <span className="tabular-nums text-foreground-muted text-xs">
                  {formatDataBR(v.dataHora)}
                </span>{' '}
                —{' '}
                <VotacaoLink votacaoId={v.votacaoId} descricao={v.descricao} />{' '}
                <span className="text-foreground-muted text-xs">
                  (votou {v.voto}, bancada {v.orientacao})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alinhamento.topConvergencias.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-medium text-foreground-muted text-xs uppercase tracking-wide">
            Top {alinhamento.topConvergencias.length} convergiu com a bancada
          </h3>
          <ul className="space-y-1.5">
            {alinhamento.topConvergencias.map((v) => (
              <li className="text-foreground text-sm" key={v.votacaoId}>
                <span className="tabular-nums text-foreground-muted text-xs">
                  {formatDataBR(v.dataHora)}
                </span>{' '}
                —{' '}
                <VotacaoLink votacaoId={v.votacaoId} descricao={v.descricao} />{' '}
                <span className="text-foreground-muted text-xs">
                  ({v.voto})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
