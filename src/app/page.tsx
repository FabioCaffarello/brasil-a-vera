import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { CardMeuParlamentar } from '@/components/home/card-meu-parlamentar'
import { CardStats } from '@/components/home/card-stats'
import { CardVotacoesSemana } from '@/components/home/card-votacoes-semana'
import { FeaturesGrid } from '@/components/home/features-grid'
import { TrustBadge } from '@/components/trust/trust-badge'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { KpiCard } from '@/design-system/compositions/kpi-card'
import { SectionCard } from '@/design-system/compositions/section-card'
import { Button } from '@/design-system/primitives/button'
import { formatNumeroAbreviado } from '@/lib/format-number'
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
    <>
      {/* HERO premium — variant gradient-glow (3 blobs animados +
          accent line + stagger reveal, 100% CSS, ADR-023). KPIs reais
          via getPublicStats(); meta pills no rodapé reforçam a
          procedência dos dados sem misturar com os números. */}
      <HeroSection
        actions={
          <>
            <Button asChild>
              <Link href="/parlamentares">
                Explorar parlamentares
                <ArrowRight aria-hidden className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/proposicoes">Ver proposições</Link>
            </Button>
          </>
        }
        description="Acompanhe deputados, votações, gastos parlamentares e a tramitação de proposições — direto das fontes oficiais."
        kicker={
          <DataBadge
            icon={<Sparkles className="h-3 w-3" />}
            label="Dados oficiais"
            source="Câmara dos Deputados"
            tone="accent"
          />
        }
        kpis={
          <KpiCard
            aria-label="Métricas do Brasil a Vera"
            items={[
              {
                label: 'Deputados',
                value: formatNumeroAbreviado(stats.totalParlamentares),
              },
              {
                label: 'Proposições',
                value: formatNumeroAbreviado(stats.totalProposicoes),
              },
              {
                label: 'Votações',
                value: formatNumeroAbreviado(stats.totalVotacoes),
              },
              { label: 'Atualização', value: 'Diária' },
            ]}
          />
        }
        meta={
          <>
            <DataBadge label="Dados oficiais" />
            <DataBadge label="Atualização diária" />
            <DataBadge label="API pública" />
          </>
        }
        title="Transparência política sem ruído."
        variant="gradient-glow"
      />

      <div className="mx-auto max-w-5xl space-y-12 px-6 py-12 sm:py-16">
        {/* FEATURES — value props inspiracionais (Sprint 6.1 PR 3, D3). */}
        <section aria-labelledby="features-titulo">
          <h2
            className="mb-6 font-semibold text-2xl tracking-tight"
            id="features-titulo"
          >
            Por que confiar nesta plataforma?
          </h2>
          <FeaturesGrid />
        </section>

        {/* ENTRY POINTS pragmáticos — portas de entrada cívicas.
            Movidos para BAIXO do features grid (Sprint 6.1 D3) — utilidade
            permanece no mapa, depois da camada inspiracional. */}
        <section aria-labelledby="entry-points-titulo">
          <h2
            className="mb-6 font-semibold text-2xl tracking-tight"
            id="entry-points-titulo"
          >
            Comece por aqui
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CardMeuParlamentar />
            <CardVotacoesSemana diasJanela={diasJanela} votacoes={votacoes} />
            <CardStats stats={stats} />
          </div>
        </section>

        {/* PIRÂMIDE DE CONFIANÇA — refatorada Sprint 6.1 PR 3 D4:
            SectionCard único com lista compacta (vs 4 cards anteriores).
            Mantém âncora #piramide-confianca para TrustBadge tooltip. */}
        <SectionCard
          id="piramide-confianca"
          subtitle="Todo dado exibido no Brasil a Vera carrega um nível de confiança explícito. Nenhum número aparece sem que você saiba de onde veio."
          title="Pirâmide de Confiança"
        >
          <ul className="space-y-4">
            {trustExamples.map(({ level, example }) => (
              <li
                className="flex items-start gap-3 border-border border-b pb-4 last:border-0 last:pb-0"
                key={level}
              >
                <div className="shrink-0">
                  <TrustBadge trustLevel={level} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">
                    {TRUST_LEVEL_DESCRIPTIONS[level]}
                  </p>
                  <p className="mt-1 text-foreground-muted text-xs italic">
                    Ex: {example}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-foreground-subtle text-xs">
            Mais detalhes em{' '}
            <Link
              className="rounded text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/docs/piramide-de-confianca"
            >
              /docs/piramide-de-confianca
            </Link>
            .
          </p>
        </SectionCard>
      </div>
    </>
  )
}
