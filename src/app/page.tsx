import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { CardMeuParlamentar } from '@/components/home/card-meu-parlamentar'
import { CardStats } from '@/components/home/card-stats'
import { CardVotacoesSemana } from '@/components/home/card-votacoes-semana'
import { TrustBadge } from '@/components/trust/trust-badge'
import { Button } from '@/design-system/primitives/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/design-system/primitives/card'
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
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      {/* HERO — grid-bg adiciona textura sutil (utilitário Sprint 4.0 PR 2) */}
      <header className="relative mb-12">
        <div
          aria-hidden
          className="-z-10 grid-bg pointer-events-none absolute inset-x-0 top-[-3rem] h-[calc(100%+6rem)]"
        />
        <h1 className="font-semibold text-4xl text-foreground tracking-tight sm:text-5xl">
          Brasil a Vera
        </h1>
        <p className="mt-3 max-w-2xl text-foreground-muted text-lg sm:text-xl">
          Você escolheu quem te representa. Agora veja o que ele faz.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/o-meu-parlamentar">
              Encontrar meus representantes
              <ArrowRight aria-hidden className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/parlamentares">Explorar parlamentares</Link>
          </Button>
        </div>
        <p className="mt-6 inline-flex items-center rounded bg-surface-elevated px-3 py-1 text-foreground-muted text-xs">
          Wave 4 em andamento · v0.4.0-design-system-foundation
        </p>
      </header>

      {/* Cards narrativos — Sprint 3.1 Tarefa 2 (refatorados na 4.1 PR 4).
          Portas de entrada cívicas para cidadão que chega sem nome em mente. */}
      <section aria-labelledby="cards-narrativos-titulo" className="mb-12">
        <h2 className="sr-only" id="cards-narrativos-titulo">
          Portas de entrada
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CardMeuParlamentar />
          <CardVotacoesSemana diasJanela={diasJanela} votacoes={votacoes} />
          <CardStats stats={stats} />
        </div>
      </section>

      {/* PIRÂMIDE DE CONFIANÇA — refatorada com Card primitive + tokens.
          Mantém âncora #piramide-confianca usada por TrustBadge tooltip. */}
      <section
        aria-labelledby="piramide-confianca-titulo"
        id="piramide-confianca"
      >
        <h2
          className="mb-3 font-medium text-foreground-muted text-sm uppercase tracking-wide"
          id="piramide-confianca-titulo"
        >
          Pirâmide de Confiança
        </h2>
        <p className="mb-6 max-w-3xl text-foreground-muted text-sm">
          Todo dado exibido no Brasil a Vera carrega um nível de confiança
          explícito. Nenhum número aparece sem que você saiba de onde veio.
        </p>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {trustExamples.map(({ level, example }) => (
            <li key={level}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {TRUST_LEVEL_DESCRIPTIONS[level]}
                    </CardTitle>
                    <TrustBadge trustLevel={level} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-muted text-sm italic">
                    Ex: {example}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-foreground-subtle text-xs">
          Mais detalhes em{' '}
          <Link
            className="text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/docs/piramide-de-confianca"
          >
            /docs/piramide-de-confianca
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
