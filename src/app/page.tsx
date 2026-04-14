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
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Brasil a Vera
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Você escolheu quem te representa. Agora veja o que ele faz.
        </p>
        <p className="mt-4 inline-block rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Wave 0 — Fundação em andamento
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
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
    </main>
  )
}
