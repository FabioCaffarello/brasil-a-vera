// Cópia-rds de src/components/parlamentar/pares-contraditorios.tsx
// (piloto-2). Server Component. Acento warning subtle das caixas
// preservado (border-warning/40 bg-warning/5 — RDS define
// --color-warning com Δ próximo, nome mantido). Badges de direção:
// destructive→error (rose-400 no RDS, tradução canônica estendida
// na piloto-2). TrustBadge (client island) e getTipoVotoStyle (lib
// compartilhada) importados dos originais.

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
      ? 'bg-error/20 text-fg-error'
      : 'bg-success/20 text-fg-success'

  return (
    <div className="rounded-lg border border-line-default p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-fg-tertiary text-xs">
        <span>{formatDataBR(voto.dataHora)}</span>
        <span aria-hidden>·</span>
        <Link
          className="font-medium font-mono text-fg-primary underline decoration-dotted underline-offset-2 hover:text-fg-tertiary"
          href={`/proposicoes/${voto.proposicaoTipo}/${voto.proposicaoNumero}/${voto.proposicaoAno}`}
        >
          {formatProposicaoRef(
            voto.proposicaoTipo,
            voto.proposicaoNumero,
            voto.proposicaoAno,
          )}
        </Link>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-xs ${direcaoClass}`}
        >
          {direcaoLabel}
        </span>
      </div>
      <p className="mb-2 line-clamp-2 text-fg-primary text-sm">{voto.ementa}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-fg-tertiary">Votou:</span>
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
          <span className="text-fg-tertiary text-xs">
            Pipeline com verbos inequívocos — sem NLP no MVP.
          </span>
        </div>
        <p className="text-fg-tertiary text-sm">
          Nenhum par contraditório detectado para este parlamentar com a base
          atual. Pode ser por um dos seguintes motivos:
        </p>
        <ul className="space-y-1 pl-5 text-fg-tertiary text-sm [list-style-type:disc]">
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
        <p className="text-fg-tertiary text-xs">
          A classificação de direção usa apenas verbos inequívocos — falso
          negativo é preferível a falso positivo. Expansão do vocabulário
          (verbos secundários, regex, NLP) entra apenas com evidência de gargalo
          concreto (princípio do{' '}
          <a
            className="underline decoration-dotted underline-offset-2"
            href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/ADR/019-disciplina-arquitetural-sem-gargalo.md"
            rel="noopener noreferrer"
            target="_blank"
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
        <span className="text-fg-tertiary text-xs">
          {stats.paresContraditoriosDetectados}{' '}
          {stats.paresContraditoriosDetectados === 1 ? 'par' : 'pares'} em{' '}
          {stats.votosClassificados} votos classificáveis.
        </span>
      </div>

      <ul className="space-y-4">
        {pares.map((par, i) => (
          <li
            className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-4"
            key={`${par.voto1.votacaoId}-${par.voto2.votacaoId}`}
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-fg-warning text-xs uppercase tracking-wide">
                Votos em direções opostas · Tema: {par.tema}
              </span>
              <span className="text-fg-tertiary text-xs">
                {par.diasEntreVotos === 0
                  ? 'Mesmo dia'
                  : `${par.diasEntreVotos} dia${par.diasEntreVotos === 1 ? '' : 's'} entre os votos`}
              </span>
            </header>
            <VotoCard voto={par.voto1} />
            <VotoCard voto={par.voto2} />
            <p className="text-fg-tertiary text-xs italic">
              Apresentamos os fatos sem juízo de valor. Contexto importa —
              substitutivos, mudança de partido e relator podem explicar a
              diferença. Verifique cada votação na fonte oficial antes de
              concluir.
              {i === 0 && (
                <>
                  {' '}
                  <a
                    className="underline decoration-dotted underline-offset-2"
                    href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/future/COHERENCE-ENGINE.md"
                    rel="noopener noreferrer"
                    target="_blank"
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
