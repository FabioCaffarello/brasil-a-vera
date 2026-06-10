// Cópia-rds de src/components/parlamentar/afinidade-voto.tsx (piloto-2).
// Server Component. TrustBadge (client island compartilhado) importado
// do original. Tokens traduzidos pela tabela canônica.

import Link from 'next/link'

import { TrustBadge } from '@/components/trust/trust-badge'
import {
  type AfinidadeVoto as AfinidadeRow,
  TOP5_JANELA_MESES,
  TOP5_QUORUM_MINIMO,
} from '@/lib/queries/parlamentares'

interface Props {
  afinidades: AfinidadeRow[]
}

export function Top5Afinidade({ afinidades }: Props) {
  if (afinidades.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem votos nominais em quantidade suficiente para calcular afinidade. São
        necessárias ao menos {TOP5_QUORUM_MINIMO} votações em comum com outros
        parlamentares nos últimos {TOP5_JANELA_MESES} meses — pode acontecer com
        parlamentares recém-empossados, em casas diferentes (cruzamento entre
        Câmara e Senado não é possível) ou com histórico majoritariamente fora
        da janela.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrustBadge trustLevel="L2" />
        <span className="text-fg-tertiary text-xs">
          Agregação determinística — fórmula em{' '}
          <a
            className="underline decoration-dotted underline-offset-2"
            href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/TRUST-PYRAMID.md"
            rel="noopener noreferrer"
            target="_blank"
          >
            docs
          </a>
        </span>
      </div>

      <ul className="space-y-2">
        {afinidades.map((a, i) => (
          <li
            className="flex items-center gap-3 rounded-lg border border-line-default p-3"
            key={a.parlamentarId}
          >
            <span
              aria-hidden
              className="shrink-0 font-medium font-mono text-fg-tertiary text-sm"
            >
              {i + 1}.
            </span>
            {a.urlFoto ? (
              // biome-ignore lint/performance/noImgElement: foto remota; dimensões explícitas evitam CLS.
              <img
                alt=""
                className="size-10 shrink-0 rounded-full object-cover"
                height={40}
                loading="lazy"
                src={a.urlFoto}
                width={40}
              />
            ) : (
              <div
                aria-hidden="true"
                className="size-10 shrink-0 rounded-full bg-surface-raised"
              />
            )}
            <div className="min-w-0 flex-1">
              <Link
                className="block truncate font-medium text-fg-primary underline decoration-dotted underline-offset-2 hover:text-fg-tertiary"
                href={`/parlamentares/${a.parlamentarId}`}
              >
                {a.nome}
              </Link>
              <p className="truncate text-fg-tertiary text-xs">
                {a.partidoSigla}/{a.uf}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="font-semibold text-fg-primary text-lg">
                {a.percentualAfinidade}%
              </p>
              <p className="text-fg-tertiary text-xs">
                {a.votosCoincidentes}/{a.totalVotosEmComum}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-fg-tertiary text-xs">
        Cálculo considera{' '}
        <strong>mínimo de {TOP5_QUORUM_MINIMO} votações em comum</strong> nos
        últimos <strong>{TOP5_JANELA_MESES} meses</strong>. Pares ordenados por
        percentual de afinidade; empates desempatam pela base maior.
      </p>

      <details className="text-fg-tertiary text-xs">
        <summary className="cursor-pointer">Como é calculado</summary>
        <p className="mt-2 max-w-prose">
          Para cada outro parlamentar que votou nas mesmas votações nominais que
          este nos últimos {TOP5_JANELA_MESES} meses, contamos quantos votos
          coincidiram (mesmo SIM/NÃO/Abstenção). Votos AUSENTE em qualquer lado
          são excluídos — &quot;ambos ausentes&quot; não é concordância
          política, é apenas não-presença. Mínimo de {TOP5_QUORUM_MINIMO}{' '}
          votações em comum para incluir um par (recalibrado no Sprint 3.0.5 a
          partir do mínimo anterior de 5 — distribuição empírica mostrou que
          18,4% dos pares atingiam 100% com quórum 5, indicador de amostra
          pequena, não de afinidade real).
        </p>
      </details>
    </div>
  )
}
