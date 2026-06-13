// Onda HeroSection — cópia-rds da home (/) sob /rds/home para validar a
// migração ao @fabio.caffarello/react-design-system 3.12.0 (a 3.12.0
// destravou HeroSection, #163). ÚLTIMA rota da onda HeroSection.
//
// Convive em paralelo com a rota original (strangler fig); promoção é
// decisão futura. O chrome (Navbar + Footer + Toaster + skip-link) vem do
// root layout `src/app/layout.tsx` por composição nested — NÃO importar aqui.
// O RdsStagingLayout (src/app/rds/layout.tsx) só adiciona wrapper + noindex.
//
// Posicionamento: src/app/rds/home/page.tsx (a raiz /rds/ é o índice de
// smoke, sem page.tsx; /rds/home não colide com o layout nem com o índice).
//
// Substituições estruturais vs original:
// - HeroSection (composição local) → HeroSection do RDS /server (server-safe;
//   API local→RDS 1:1 — kicker/title/description/actions/kpis/meta/variant/
//   align; o slot `kpis` é opaco e recebe o KpiCard local).
// - KpiCard (composição local)     → cópia LOCAL traduzida em ./_components/
//   (decisão de scoping aprovada — opção A): o Stat/StatGroup do RDS NÃO tem
//   slot para `floatingBadge` (TrustBadge L1 sobreposto à borda) e renderiza
//   strip dividido em vez de card elevado com gutters; adotá-lo perderia o
//   selo L1 e mudaria o visual da rota mais visível. Mesma régua de
//   apresentacional local quando o RDS não cobre a API (EmptyState/Button).
// - SectionCard (composição local) → cópia local sobre Card compound do RDS
//   (reuso verbatim piloto-2 / busca / comparar).
// - CardParlamentares, CardVotacoesSemana, FeaturesGrid → cópias de domínio
//   traduzidas em ./_components/.
// - Button (primitivo local)       → cópia LOCAL traduzida (RDS Button é
//   client, +JS contra ADR-022); reuso verbatim das listagens.
// - DataBadge, TrustBadge          → mantidos (import dos ORIGINAIS):
//   DataBadge sem par RDS (precedente listagens/perfis); TrustBadge é client
//   island de domínio (tooltip de procedência).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md.

import { HeroSection } from '@fabio.caffarello/react-design-system/server'
import {
  ArrowRight,
  Clock,
  FileText,
  Sparkles,
  Users,
  Vote,
} from 'lucide-react'
import Link from 'next/link'
import { TrustBadge } from '@/components/trust/trust-badge'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { formatNumeroAbreviado } from '@/lib/format-number'
import { getPublicStats } from '@/lib/queries/stats-public'
import { getVotacoesRecentes } from '@/lib/queries/votacoes'
import type { TrustLevel } from '@/shared/trust'
import { TRUST_LEVEL_DESCRIPTIONS } from '@/shared/trust'
import { Button } from './_components/button'
import { CardParlamentares } from './_components/card-parlamentares'
import { CardVotacoesSemana } from './_components/card-votacoes-semana'
import { FeaturesGrid } from './_components/features-grid'
import { KpiCard } from './_components/kpi-card'
import { SectionCard } from './_components/section-card'

export const metadata = {
  title: 'Transparência política sem ruído (rds-pilot) — Brasil à Vera',
  description:
    'Acompanhe deputados, votações, gastos parlamentares e a tramitação de proposições — direto das fontes oficiais.',
}

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
// Preservado do original.
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
      {/* HERO minimalista — variant `plain` (fundo escuro só, sem grid nem
          blobs) + align `center` (slogan, CTAs e KpiCard centralizados).
          KPIs reais via getPublicStats(); meta pills reforçam procedência. */}
      <HeroSection
        actions={
          <>
            <Button asChild>
              <Link href="/rds/parlamentares">
                Explorar parlamentares
                <ArrowRight aria-hidden className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/rds/proposicoes">Ver proposições</Link>
            </Button>
          </>
        }
        align="center"
        description="Acompanhe deputados, votações, gastos parlamentares e a tramitação de proposições — direto das fontes oficiais."
        kicker={
          <DataBadge
            icon={<Sparkles className="h-3 w-3" />}
            label="Dados oficiais"
            source=""
            tone="accent"
          />
        }
        kpis={
          <KpiCard
            aria-label="Métricas do Brasil à Vera"
            floatingBadge={<TrustBadge trustLevel="L1" />}
            items={[
              {
                icon: <Users className="h-6 w-6" />,
                label: 'Parlamentares',
                value: formatNumeroAbreviado(stats.totalParlamentares),
              },
              {
                icon: <FileText className="h-6 w-6" />,
                label: 'Proposições',
                value: formatNumeroAbreviado(stats.totalProposicoes),
              },
              {
                icon: <Vote className="h-6 w-6" />,
                label: 'Votações',
                value: formatNumeroAbreviado(stats.totalVotacoes),
              },
              {
                icon: <Clock className="h-6 w-6" />,
                label: 'Atualização',
                value: 'Diária',
              },
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
        variant="plain"
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

        {/* ENTRY POINTS pragmáticos — portas de entrada cívicas. */}
        <section aria-labelledby="entry-points-titulo">
          <h2
            className="mb-6 font-semibold text-2xl tracking-tight"
            id="entry-points-titulo"
          >
            Comece por aqui
          </h2>
          <div className="flex flex-col gap-4">
            <CardParlamentares />
            <CardVotacoesSemana diasJanela={diasJanela} votacoes={votacoes} />
          </div>
        </section>

        {/* PIRÂMIDE DE CONFIANÇA — SectionCard único com lista compacta.
            Mantém âncora #piramide-confianca para o link do TrustBadge. */}
        <SectionCard
          id="piramide-confianca"
          subtitle="Todo dado exibido no Brasil à Vera carrega um nível de confiança explícito. Nenhum número aparece sem que você saiba de onde veio."
          title="Pirâmide de Confiança"
        >
          <ul className="space-y-4">
            {trustExamples.map(({ level, example }) => (
              <li
                className="flex items-start gap-3 border-line-default border-b pb-4 last:border-0 last:pb-0"
                key={level}
              >
                <div className="shrink-0">
                  <TrustBadge trustLevel={level} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-fg-primary text-sm">
                    {TRUST_LEVEL_DESCRIPTIONS[level]}
                  </p>
                  <p className="mt-1 text-fg-tertiary text-xs italic">
                    Ex: {example}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-fg-quaternary text-xs">
            Mais detalhes em{' '}
            <Link
              className="rounded text-fg-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
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
