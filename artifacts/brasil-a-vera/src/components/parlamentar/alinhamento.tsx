import { Link } from 'wouter'

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
      href={`/votacoes/${votacaoId}`}
      className="text-zinc-800 hover:text-zinc-950 hover:underline dark:text-zinc-200 dark:hover:text-zinc-50"
    >
      {descricao}
    </Link>
  )
}

export function AlinhamentoBancada({ alinhamento, casa }: Props) {
  if (alinhamento.total === 0) {
    if (casa === 'SENADO') {
      return (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          O Senado não publica orientações de bancada em endpoint público (
          <a
            href="https://github.com/FabioCaffarello/brasil-a-vera/issues/83"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2"
          >
            #83
          </a>
          ). O alinhamento partidário não é calculável para senadores nesta
          versão.
        </p>
      )
    }
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
      ? 'text-zinc-500 dark:text-zinc-400'
      : alinhamento.percentual >= 80
        ? 'text-emerald-700 dark:text-emerald-400'
        : alinhamento.percentual >= 50
          ? 'text-zinc-700 dark:text-zinc-300'
          : 'text-amber-700 dark:text-amber-400'

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold text-3xl tabular-nums ${percentColor}`}>
          {alinhamento.percentual}%
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          alinhado ao {alinhamento.partidoSigla}
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {alinhamento.alinhados} alinhadas e {alinhamento.divergentes}{' '}
        divergentes, em {alinhamento.total} votações com orientação da bancada.
        Votos AUSENTE e orientações LIBERADO não entram no cálculo.
      </p>
      {alinhamento.amostraInsuficiente && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Amostra pequena (menos de {ALINHAMENTO_AMOSTRA_MINIMA} votações). O
          percentual é informativo mas estatisticamente frágil.
        </p>
      )}

      {alinhamento.topDivergencias.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Top {alinhamento.topDivergencias.length} divergiu da bancada
          </h3>
          <ul className="space-y-1.5">
            {alinhamento.topDivergencias.map((v) => (
              <li
                key={v.votacaoId}
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {formatDataBR(v.dataHora)}
                </span>{' '}
                —{' '}
                <VotacaoLink votacaoId={v.votacaoId} descricao={v.descricao} />{' '}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  (votou {v.voto}, bancada {v.orientacao})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alinhamento.topConvergencias.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Top {alinhamento.topConvergencias.length} convergiu com a bancada
          </h3>
          <ul className="space-y-1.5">
            {alinhamento.topConvergencias.map((v) => (
              <li
                key={v.votacaoId}
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  {formatDataBR(v.dataHora)}
                </span>{' '}
                —{' '}
                <VotacaoLink votacaoId={v.votacaoId} descricao={v.descricao} />{' '}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
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
