// Home (/) — promovida ao RDS (migração ADR-033). Consome o design system
// @fabio.caffarello/react-design-system — tokens traduzidos pela tabela
// canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Arquitetura de informação action-first: Hero → portas de entrada (ação) →
// Votações da semana (prova de vida) → Por que confiar + Pirâmide
// (credibilidade).
//
// - HeroSection do RDS /server com variant `plain` + slots idiomáticos:
//   `kicker`/`meta` como texto (não pill). O slot `kpis` recebe um StatGroup.
// - StatGroup + Stat do RDS para os KPIs do hero, com `floatingBadge` para o
//   TrustBadge L1 (slot entregue na RDS 4.6.0 / issue #245 — destravou aposentar
//   a composição local KpiCard, ADR-038).
// - EntryCard (Card compound do RDS) para as portas de entrada;
//   CardVotacoesSemana/FeaturesGrid de @/components/home.
// - TrustBadge (client island) mantido.

import {
  Button,
  HeroSection,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import { ArrowRight, Clock, FileText, Tags, Users, Vote } from 'lucide-react'
import Link from 'next/link'
import { CardVotacoesSemana } from '@/components/home/card-votacoes-semana'
import { EntryCard } from '@/components/home/entry-card'
import { FeaturesGrid } from '@/components/home/features-grid'
import { TrustBadge } from '@/components/trust/trust-badge'
import { SectionCard } from '@/design-system/compositions/section-card'
import { formatNumeroAbreviado } from '@/lib/format-number'
import { getPublicStats } from '@/lib/queries/stats-public'
import { getVotacoesRecentes } from '@/lib/queries/votacoes'
import type { TrustLevel } from '@/shared/trust'
import { TRUST_LEVEL_DESCRIPTIONS } from '@/shared/trust'

export const metadata = {
  title: 'Transparência política sem ruído — Brasil à Vera',
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
      {/* HERO — variant `plain` (fundo do shell, sem gradiente) + align
          `center`. Slots idiomáticos: `kicker` como eyebrow (RDS renderiza
          uppercase brand) e `meta` como linha de caption de baixa ênfase.
          KPIs reais via getPublicStats(). */}
      <HeroSection
        actions={
          <>
            <Button asChild>
              <Link href="/quem-me-representa">
                Quem me representa?
                <ArrowRight aria-hidden className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/votacoes">Ver votações</Link>
            </Button>
          </>
        }
        align="center"
        description="Acompanhe deputados, votações, gastos parlamentares e a tramitação de proposições — direto das fontes oficiais."
        kicker="Dados oficiais do Legislativo"
        kpis={
          <StatGroup
            aria-label="Métricas do Brasil à Vera"
            className="mx-auto max-w-5xl"
            cols={4}
            floatingBadge={<TrustBadge trustLevel="L1" />}
            layout="grid"
          >
            <Stat
              align="center"
              icon={<Users className="h-6 w-6" />}
              label="Parlamentares"
              value={formatNumeroAbreviado(stats.totalParlamentares)}
            />
            <Stat
              align="center"
              icon={<FileText className="h-6 w-6" />}
              label="Proposições"
              value={formatNumeroAbreviado(stats.totalProposicoes)}
            />
            <Stat
              align="center"
              icon={<Vote className="h-6 w-6" />}
              label="Votações"
              value={formatNumeroAbreviado(stats.totalVotacoes)}
            />
            <Stat
              align="center"
              icon={<Clock className="h-6 w-6" />}
              label="Atualização"
              value="Diária"
            />
          </StatGroup>
        }
        meta="Câmara · Senado · Portal da Transparência · API pública · Sem cadastro"
        title="Transparência política sem ruído."
        variant="plain"
      />

      {/* Container alinhado ao grid do shell (navbar/footer usam max-w-6xl px-4).
          max-w-screen-xl do RDS Container = 1280px ≠ 1152px da navbar, então
          inline Tailwind preserva o alinhamento correto. space-y-10 (40px)
          substitui space-y-12 (48px): ritmo editorial sem "blocos soltos". */}
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:py-16">
        {/* ATO 1: EXPLORAR — ação primeiro */}

        {/* ENTRY POINTS — portas de entrada cívicas em grid (ação primeiro).
            Grid 1/2/3-up; EntryCard sobre o Card do RDS, equal-height. */}
        <section aria-labelledby="entry-points-titulo">
          <h2
            className="mb-6 font-semibold text-2xl tracking-tight"
            id="entry-points-titulo"
          >
            Comece por aqui
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <EntryCard
              description="Explore deputados federais e senadores em exercício — filtre por casa, UF, partido e veja o perfil 360 de cada um."
              href="/parlamentares"
              icon={<Users className="size-5" />}
              title="Quem está no Congresso"
            />
            <EntryCard
              description="Acompanhe projetos de lei e a tramitação das proposições direto das fontes oficiais da Câmara e do Senado."
              href="/proposicoes"
              icon={<FileText className="size-5" />}
              title="Proposições em tramitação"
            />
            <EntryCard
              cta="Ver temas"
              description="Entre por assunto: saúde, educação, segurança e mais. Cada tema reúne as proposições classificadas pela própria Câmara."
              href="/temas"
              icon={<Tags className="size-5" />}
              title="Explorar por tema"
            />
          </div>
        </section>

        {/* VOTAÇÕES DA SEMANA — prova de vida: dado real, atualizado pelo cron.
            Bloco full-width próprio (fallback 7d→30d via prop diasJanela). */}
        <section aria-labelledby="votacoes-semana-titulo">
          <h2
            className="mb-6 font-semibold text-2xl tracking-tight"
            id="votacoes-semana-titulo"
          >
            O que o Congresso votou
          </h2>
          <CardVotacoesSemana diasJanela={diasJanela} votacoes={votacoes} />
        </section>

        {/* ATO 2: CREDIBILIDADE — zona visual agrupada com borda + fundo sutil.
            Separa "usar a plataforma" de "confiar na plataforma" sem criar
            nível card-in-card (wrapper é composição de layout, não Card RDS). */}
        <div className="space-y-8 rounded-xl border border-line-default bg-surface-base/50 p-6 sm:p-8">
          {/* FEATURES — credibilidade: por que confiar na plataforma. */}
          <section aria-labelledby="features-titulo">
            <h2
              className="mb-6 font-semibold text-2xl tracking-tight"
              id="features-titulo"
            >
              Por que confiar nesta plataforma?
            </h2>
            <FeaturesGrid />
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
      </div>
    </>
  )
}
