import Link from 'next/link'

import { TrustBadge } from '@/components/trust/trust-badge'
import {
  formatDataBR,
  formatProposicaoRef,
  getTipoVotoStyle,
} from '@/lib/format'
import type { CoerenciaStats, ParContraditorio } from '@/lib/queries/coerencia'

interface Props {
  pares: ParContraditorio[]
  stats: CoerenciaStats
}

function VotoCard({ voto }: { voto: ParContraditorio['voto1'] }) {
  const style = getTipoVotoStyle(voto.voto)
  const direcaoLabel =
    voto.direcao === 'RESTRITIVA' ? 'Restritiva' : 'Permissiva'
  const direcaoClass =
    voto.direcao === 'RESTRITIVA'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'

  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>{formatDataBR(voto.dataHora)}</span>
        <span aria-hidden>·</span>
        <Link
          href={`/proposicoes/${voto.proposicaoTipo}/${voto.proposicaoNumero}/${voto.proposicaoAno}`}
          className="font-mono font-medium text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          {formatProposicaoRef(
            voto.proposicaoTipo,
            voto.proposicaoNumero,
            voto.proposicaoAno,
          )}
        </Link>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${direcaoClass}`}
        >
          {direcaoLabel}
        </span>
      </div>
      <p className="mb-2 line-clamp-2 text-sm text-zinc-800 dark:text-zinc-200">
        {voto.ementa}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">Votou:</span>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 font-semibold ${style.classes}`}
        >
          {style.label}
        </span>
      </div>
    </div>
  )
}

export function ParesContraditorios({ pares, stats }: Props) {
  if (pares.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrustBadge trustLevel="L2" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Pipeline com verbos inequívocos — sem NLP no MVP.
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nenhum par contraditório detectado para este parlamentar com a base
          atual. Pode ser por um dos seguintes motivos:
        </p>
        <ul className="space-y-1 pl-5 text-sm text-zinc-500 dark:text-zinc-400 [list-style-type:disc]">
          <li>
            <strong className="font-medium">
              Votação vinculada a proposição:
            </strong>{' '}
            {stats.votosTotaisComProposicao === 1
              ? '1 voto deste parlamentar está vinculado'
              : `${stats.votosTotaisComProposicao} votos deste parlamentar estão vinculados`}{' '}
            a uma proposição ingerida. O backfill cobre todas as votações
            nominais Câmara automaticamente (auto-fetch reverso, Sprint 3.0.5);
            Senado não retorna referência de proposição vinculada na API
            pública.
          </li>
          <li>
            <strong className="font-medium">Ementa não classificada:</strong>{' '}
            {stats.votosClassificados === 1
              ? 'apenas 1 voto tem'
              : `apenas ${stats.votosClassificados} votos têm`}{' '}
            direção inequívoca (verbos como &quot;proíbe&quot;,
            &quot;autoriza&quot;, &quot;revoga&quot;). Ementas vagas
            (&quot;altera&quot;, &quot;modifica&quot;) ficam como
            NÃO_CLASSIFICADA por design — falso negativo é preferível a falso
            positivo.
          </li>
          <li>
            <strong className="font-medium">Tema em comum obrigatório:</strong>{' '}
            pares só existem entre proposições que compartilham ao menos um tema
            oficial. Senado não classifica temas no endpoint atual.
          </li>
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          A classificação de direção usa apenas verbos inequívocos — falso
          negativo é preferível a falso positivo. Expansão do vocabulário
          (verbos secundários, regex, NLP) entra apenas com evidência de gargalo
          concreto (princípio do{' '}
          <a
            href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/ADR/019-disciplina-arquitetural-sem-gargalo.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2"
          >
            ADR-019
          </a>
          ). A cobertura cresce naturalmente conforme novas votações nominais
          são ingeridas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrustBadge trustLevel="L2" />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {stats.paresContraditoriosDetectados}{' '}
          {stats.paresContraditoriosDetectados === 1 ? 'par' : 'pares'} em{' '}
          {stats.votosClassificados} votos classificáveis.
        </span>
      </div>

      <ul className="space-y-4">
        {pares.map((par, i) => (
          <li
            key={`${par.voto1.votacaoId}-${par.voto2.votacaoId}`}
            className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Votos em direções opostas · Tema: {par.tema}
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {par.diasEntreVotos === 0
                  ? 'Mesmo dia'
                  : `${par.diasEntreVotos} dia${par.diasEntreVotos === 1 ? '' : 's'} entre os votos`}
              </span>
            </header>
            <VotoCard voto={par.voto1} />
            <VotoCard voto={par.voto2} />
            <p className="text-xs italic text-zinc-600 dark:text-zinc-400">
              Apresentamos os fatos sem juízo de valor. Contexto importa —
              substitutivos, mudança de partido e relator podem explicar a
              diferença. Verifique cada votação na fonte oficial antes de
              concluir.
              {i === 0 && (
                <>
                  {' '}
                  <a
                    href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/future/COHERENCE-ENGINE.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2"
                  >
                    Metodologia completa
                  </a>
                  .
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
