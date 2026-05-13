import Link from 'next/link'

import { TrustBadge } from '@/components/trust/trust-badge'
import type { AfinidadeVoto as AfinidadeRow } from '@/lib/queries/parlamentares'

interface Props {
  afinidades: AfinidadeRow[]
}

export function Top5Afinidade({ afinidades }: Props) {
  if (afinidades.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem votos nominais em quantidade suficiente para calcular afinidade. São
        necessárias ao menos 5 votações em comum com outros parlamentares — pode
        acontecer com parlamentares recém-empossados ou em casas diferentes
        (cruzamento entre Câmara e Senado não é possível).
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrustBadge trustLevel="L2" />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Agregação determinística — fórmula em{' '}
          <a
            href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/TRUST-PYRAMID.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2"
          >
            docs
          </a>
        </span>
      </div>

      <ul className="space-y-2">
        {afinidades.map((a, i) => (
          <li
            key={a.parlamentarId}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
          >
            <span
              className="shrink-0 font-mono text-sm font-medium text-zinc-500 dark:text-zinc-400"
              aria-hidden
            >
              {i + 1}.
            </span>
            {a.urlFoto ? (
              // biome-ignore lint/performance/noImgElement: foto remota; dimensões explícitas evitam CLS.
              <img
                src={a.urlFoto}
                alt=""
                loading="lazy"
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="size-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700"
              />
            )}
            <div className="min-w-0 flex-1">
              <Link
                href={`/parlamentares/${a.parlamentarId}`}
                className="block truncate font-medium text-zinc-800 underline decoration-dotted underline-offset-2 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400"
              >
                {a.nome}
              </Link>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {a.partidoSigla}/{a.uf}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                {a.percentualAfinidade}%
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {a.votosCoincidentes}/{a.totalVotosEmComum}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Cálculo considera <strong>mínimo de 5 votações em comum</strong>. Quando
        o pareamento tem poucas votações coincidentes, o percentual pode atingir
        100% sem refletir afinidade política real — apenas amostra pequena. A
        recalibragem com quórum mínimo maior e janela temporal entra no{' '}
        <strong>Sprint 3.0.5</strong>.
      </p>

      <details className="text-xs text-zinc-500 dark:text-zinc-400">
        <summary className="cursor-pointer">Como é calculado</summary>
        <p className="mt-2 max-w-prose">
          Para cada outro parlamentar que votou nas mesmas votações nominais que
          este, contamos quantos votos coincidiram (mesmo SIM/NÃO/Abstenção).
          Votos AUSENTE em qualquer lado são excluídos — &quot;ambos
          ausentes&quot; não é concordância política, é apenas não-presença.
          Mínimo de 5 votações em comum para incluir um par.
        </p>
      </details>
    </div>
  )
}
