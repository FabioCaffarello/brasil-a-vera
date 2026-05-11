import Link from 'next/link'

import { TrustBadge } from '@/components/trust/trust-badge'
import type { TrustLevel } from '@/shared/trust'
import { TRUST_LEVEL_DESCRIPTIONS } from '@/shared/trust'

const trustExamples: { level: TrustLevel; example: string }[] = [
  { level: 'L1', example: 'Nome e partido do deputado via API da Câmara' },
  {
    level: 'L2',
    example: 'Total de votos a favor por parlamentar (agregação)',
  },
  { level: 'L3', example: 'Índice de coerência partidária (fórmula aberta)' },
  { level: 'L4', example: 'Estimativa de alinhamento ideológico (modelo)' },
]

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Brasil a Vera
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Você escolheu quem te representa. Agora veja o que ele faz.
        </p>
        <p className="mt-4 inline-block rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Wave 1 — MVP Público
        </p>
      </header>

      <section className="mb-12">
        <Link
          href="/parlamentares"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Explorar parlamentares
          <span aria-hidden>→</span>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Pirâmide de Confiança
        </h2>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Todo dado exibido no Brasil a Vera carrega um nível de confiança
          explícito. Nenhum número aparece sem que você saiba de onde veio.
        </p>
        <ul className="space-y-4">
          {trustExamples.map(({ level, example }) => (
            <li
              key={level}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-2">
                <TrustBadge trustLevel={level} />
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {TRUST_LEVEL_DESCRIPTIONS[level]}
              </p>
              <p className="mt-1 text-sm italic text-zinc-500 dark:text-zinc-400">
                Ex: {example}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
