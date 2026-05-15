import Link from 'next/link'

import { CardMeuParlamentar } from '@/components/home/card-meu-parlamentar'
import { CardStats } from '@/components/home/card-stats'
import { CardVotacoesSemana } from '@/components/home/card-votacoes-semana'
import { TrustBadge } from '@/components/trust/trust-badge'
import { getPublicStats } from '@/lib/queries/stats-public'
import { getVotacoesRecentes } from '@/lib/queries/votacoes'
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

// Dynamic por necessidade do build: cards consomem queries (getPublicStats +
// getVotacoesRecentes) e o build do Cloudflare Workers usa placeholder
// DATABASE_URL — ISR (`revalidate`) tentaria pré-renderizar e falharia.
// Quando R2 incremental cache (#58, Wave 3+) entrar, mudar para
// `export const revalidate = 3600` — alinhado com cron de votações 4×/dia.
// Sprint 3.1 Tarefa 2.
export const dynamic = 'force-dynamic'

const VOTACOES_JANELA_PADRAO = 7
const VOTACOES_JANELA_FALLBACK = 30
const VOTACOES_LIMIT = 5

export default async function Home() {
  const [stats, recentes7d] = await Promise.all([
    getPublicStats(),
    getVotacoesRecentes(VOTACOES_JANELA_PADRAO, VOTACOES_LIMIT),
  ])

  // Fallback honesto: se 0 votações em 7 dias, busca em 30 com copy adaptado.
  const { votacoes, diasJanela } =
    recentes7d.length === 0
      ? {
          votacoes: await getVotacoesRecentes(
            VOTACOES_JANELA_FALLBACK,
            VOTACOES_LIMIT,
          ),
          diasJanela: VOTACOES_JANELA_FALLBACK,
        }
      : { votacoes: recentes7d, diasJanela: VOTACOES_JANELA_PADRAO }

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
          Wave 2 entregue · v0.2-final
        </p>
      </header>

      <section className="mb-12">
        <Link
          href="/parlamentares"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 font-medium text-sm text-white transition-colors duration-150 hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-primary-600 dark:hover:bg-primary-500"
        >
          Explorar parlamentares
          <span aria-hidden>→</span>
        </Link>
      </section>

      {/* Cards narrativos — Sprint 3.1 Tarefa 2. Portas de entrada cívicas
          para cidadão que chega sem nome em mente. */}
      <section aria-labelledby="cards-narrativos-titulo" className="mb-12">
        <h2 id="cards-narrativos-titulo" className="sr-only">
          Portas de entrada
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CardMeuParlamentar />
          <CardVotacoesSemana votacoes={votacoes} diasJanela={diasJanela} />
          <CardStats stats={stats} />
        </div>
      </section>

      <section
        id="piramide-confianca"
        aria-labelledby="piramide-confianca-titulo"
      >
        <h2
          id="piramide-confianca-titulo"
          className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
        >
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
