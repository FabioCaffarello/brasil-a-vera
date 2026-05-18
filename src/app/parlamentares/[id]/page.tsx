import {
  ArrowRight,
  FileText,
  Inbox,
  TrendingDown,
  Users,
  Vote,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Top5Afinidade } from '@/components/parlamentar/afinidade-voto'
import { AlinhamentoBancada } from '@/components/parlamentar/alinhamento'
import { GastosResumoBlock } from '@/components/parlamentar/gastos-resumo'
import { ParesContraditorios } from '@/components/parlamentar/pares-contraditorios'
import { PerfilHeader } from '@/components/parlamentar/perfil-header'
import { ProposicoesAutor } from '@/components/parlamentar/proposicoes-autor'
import { VotosRecentes } from '@/components/parlamentar/votos-recentes'
import { KpiStrip } from '@/design-system/compositions/kpi-strip'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/design-system/primitives/accordion'
import { formatBRL } from '@/lib/format'
import { getAlinhamentoParlamentar } from '@/lib/queries/alinhamento'
import {
  getCoerenciaStats,
  getParesContraditorios,
} from '@/lib/queries/coerencia'
import {
  getComparacoesCasa,
  getGastosResumo,
  getParlamentarById,
  getProposicoesAutoradas,
  getTop5Afinidade,
  getVotosRecentes,
} from '@/lib/queries/parlamentares'

const casaLabel = (casa: string) => (casa === 'CAMARA' ? 'Câmara' : 'Senado')

function formatPercentil(p: number): string {
  // 0-100 → "p1".."p99". Threshold para "p100" só com 100.0 exato (raro).
  if (p >= 99.5) return 'p99'
  if (p < 0.5) return 'p1'
  return `p${Math.round(p)}`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) return { title: 'Parlamentar — Brasil à Vera' }
  const cargo = parlamentar.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const title = `${parlamentar.nome} (${parlamentar.partidoSigla}/${parlamentar.uf}) — Brasil à Vera`
  const description = `${cargo} pelo ${parlamentar.partidoSigla}/${parlamentar.uf}. O que vota, propõe e gasta.`
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

export default async function ParlamentarPerfilPage({ params }: PageProps) {
  const { id } = await params
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) notFound()

  const anoCorrente = new Date().getFullYear()
  const [
    votos,
    proposicoes,
    gastos,
    afinidades,
    paresContraditorios,
    coerenciaStats,
    alinhamento,
    comparacoes,
  ] = await Promise.all([
    getVotosRecentes(parlamentar.id, 10),
    getProposicoesAutoradas(parlamentar.id, 5),
    getGastosResumo(parlamentar.id, anoCorrente),
    getTop5Afinidade(parlamentar.id),
    getParesContraditorios(parlamentar.id, 10),
    getCoerenciaStats(parlamentar.id),
    getAlinhamentoParlamentar(parlamentar.id),
    getComparacoesCasa(parlamentar.id),
  ])

  // KpiStrip values com fallback honesto (D1 do plano Sprint 6.3 — "—"
  // quando dados ausentes em vez de esconder o strip; mantém estrutura).
  const alinhamentoTone =
    alinhamento.percentual === null
      ? 'muted'
      : alinhamento.percentual >= 80
        ? 'success'
        : alinhamento.percentual >= 50
          ? 'default'
          : 'warning'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-5">
        <PerfilHeader
          parlamentar={{
            nome: parlamentar.nome,
            nomeCivil: parlamentar.nomeCivil,
            casa: parlamentar.casa,
            partidoSigla: parlamentar.partidoSigla,
            partidoNome: parlamentar.partidoNome,
            uf: parlamentar.uf,
            urlFoto: parlamentar.urlFoto,
            legislatura: parlamentar.legislatura,
            situacaoMandato: parlamentar.situacaoMandato,
            sourceUrl: parlamentar.sourceUrl,
            trustLevel: parlamentar.trustLevel,
          }}
        />

        <KpiStrip
          items={[
            {
              icon: <Vote className="h-4 w-4" />,
              label: 'Alinhamento à bancada',
              value:
                alinhamento.percentual === null
                  ? '—'
                  : `${alinhamento.percentual}%`,
              hint: (
                <>
                  {alinhamento.total > 0
                    ? `${alinhamento.alinhados}/${alinhamento.total} com orientação`
                    : 'sem orientação no período'}
                  {comparacoes.medianaAlinhamentoCasa !== null ? (
                    <>
                      {' · '}
                      <span className="text-foreground-subtle">
                        mediana da {casaLabel(parlamentar.casa)} em{' '}
                        {Math.round(comparacoes.medianaAlinhamentoCasa)}%
                      </span>
                    </>
                  ) : null}
                </>
              ),
              tone: alinhamentoTone,
            },
            {
              icon: <Users className="h-4 w-4" />,
              label: 'Votações analisadas',
              value: alinhamento.total > 0 ? alinhamento.total : votos.length,
              hint:
                alinhamento.total > 0
                  ? 'com orientação'
                  : 'recentes (nominais)',
            },
            {
              icon: <Inbox className="h-4 w-4" />,
              label: 'Proposições como autor',
              value: proposicoes.length,
              hint: (
                <>
                  {proposicoes.length === 5 ? 'mostrando 5 mais recentes' : ''}
                  {comparacoes.percentilProposicoesCasa !== null ? (
                    <>
                      {proposicoes.length === 5 ? ' · ' : ''}
                      <span className="text-foreground-subtle">
                        {formatPercentil(comparacoes.percentilProposicoesCasa)}{' '}
                        da {casaLabel(parlamentar.casa)}
                      </span>
                    </>
                  ) : null}
                </>
              ),
              tone: 'muted',
            },
            {
              icon: <TrendingDown className="h-4 w-4" />,
              label: `Gastos CEAP ${anoCorrente}`,
              value:
                gastos.totalRegistros === 0
                  ? '—'
                  : formatBRL(gastos.totalGeral),
              hint: (
                <>
                  {gastos.totalRegistros === 0
                    ? 'sem gastos registrados'
                    : `${gastos.totalRegistros} registros`}
                  {comparacoes.percentilGastoCasa !== null &&
                  gastos.totalRegistros > 0 ? (
                    <>
                      {' · '}
                      <span className="text-foreground-subtle">
                        {formatPercentil(comparacoes.percentilGastoCasa)} da{' '}
                        {casaLabel(parlamentar.casa)}
                      </span>
                    </>
                  ) : null}
                </>
              ),
              tone: gastos.totalRegistros === 0 ? 'muted' : 'default',
            },
          ]}
        />
      </div>

      {/* SectionNav só desktop — no mobile o Accordion abaixo já é a nav.
          (Wave 7 Sprint 7.2 PR4) */}
      <SectionNav
        className="mt-6 hidden sm:block"
        items={[
          { id: 'votos', label: 'Votos', icon: <Vote className="h-4 w-4" /> },
          {
            id: 'alinhamento',
            label: 'Alinhamento',
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: 'proposicoes',
            label: 'Proposições',
            icon: <Inbox className="h-4 w-4" />,
          },
          {
            id: 'gastos',
            label: 'Gastos',
            icon: <TrendingDown className="h-4 w-4" />,
          },
          {
            id: 'afinidade',
            label: 'Top 5',
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: 'pares',
            label: 'Pares',
            icon: <FileText className="h-4 w-4" />,
          },
        ]}
        stickyTop="3.5rem"
      />

      {/* Mobile: Accordion colapsável (Wave 7 Sprint 7.2 PR4).
          Header + Votos + Alinhamento default-expanded conforme handoff
          §Sprint 7.2 PR4 + spec PARLAMENTAR-360.md §Mobile. */}
      <Accordion
        className="mt-6 space-y-3 sm:hidden"
        defaultValue={['votos', 'alinhamento']}
        type="multiple"
      >
        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="votos"
        >
          <AccordionTrigger className="font-semibold text-base">
            Votos recentes
          </AccordionTrigger>
          <AccordionContent>
            <VotosRecentes votos={votos} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="alinhamento"
        >
          <AccordionTrigger className="font-semibold text-base">
            Alinhamento à bancada
          </AccordionTrigger>
          <AccordionContent>
            <AlinhamentoBancada
              alinhamento={alinhamento}
              casa={parlamentar.casa}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="proposicoes"
        >
          <AccordionTrigger className="font-semibold text-base">
            Proposições onde é autor ou coautor
          </AccordionTrigger>
          <AccordionContent>
            <ProposicoesAutor proposicoes={proposicoes} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="gastos"
        >
          <AccordionTrigger className="font-semibold text-base">
            Gastos parlamentares — {anoCorrente}
          </AccordionTrigger>
          <AccordionContent>
            <GastosResumoBlock ano={anoCorrente} resumo={gastos} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="afinidade"
        >
          <AccordionTrigger className="font-semibold text-base">
            Top 5 maior afinidade de voto
          </AccordionTrigger>
          <AccordionContent>
            <Top5Afinidade afinidades={afinidades} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="pares"
        >
          <AccordionTrigger className="font-semibold text-base">
            Pares de votos em direções opostas
          </AccordionTrigger>
          <AccordionContent>
            <ParesContraditorios
              pares={paresContraditorios}
              stats={coerenciaStats}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Desktop: stack linear de SectionCards (mantém scroll-spy anchors). */}
      <div className="mt-6 hidden space-y-5 sm:block">
        {/* Tier 1 — ação legislativa (cobertura ≥ 22%). Ordem: o que votou →
            se seguiu a bancada → o que propôs → como gastou. Sprint 3.1
            Tarefa 3 — hierarquia reflete cobertura empírica. */}
        <SectionCard
          className="scroll-mt-28"
          id="votos"
          subtitle="Apenas votações nominais (com voto individual registrado). Comissões frequentemente decidem em votação simbólica — esses casos não aparecem aqui."
          title="Votos recentes"
        >
          <VotosRecentes votos={votos} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="alinhamento"
          subtitle="% de votos que coincidem com a orientação do partido. Mede a fidelidade prática à liderança partidária — não compromisso ideológico."
          title="Alinhamento à bancada"
        >
          <AlinhamentoBancada
            alinhamento={alinhamento}
            casa={parlamentar.casa}
          />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="proposicoes"
          subtitle="Limitado às proposições já ingeridas no Brasil à Vera. Pode não refletir toda a produção legislativa histórica do parlamentar."
          title="Proposições onde é autor ou coautor"
        >
          <ProposicoesAutor proposicoes={proposicoes} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="gastos"
          subtitle="Cota para Exercício da Atividade Parlamentar (CEAP) reportada pela Câmara. Senado tem regime próprio, ainda não ingerido."
          title={`Gastos parlamentares — ${anoCorrente}`}
        >
          <GastosResumoBlock ano={anoCorrente} resumo={gastos} />
        </SectionCard>

        {/* Top 5 + Pares promovidos para Tier 1 (Wave 7 Sprint 7.1 PR5).
            Decisão do handoff: fecham a jornada cívica do Cidadão Consciente
            — quem é parecido e onde diverge — antes de Compartilhar. Sem
            separador visual nem header agrupador; SectionNav (acima) já
            sinaliza as 6 seções em ordem (Votos → Alinh → Propos → Gastos
            → Top 5 → Pares). */}
        <SectionCard
          className="scroll-mt-28"
          id="afinidade"
          subtitle="Outros parlamentares que mais coincidem no voto. Mostra concordância prática, não alinhamento ideológico declarado."
          title="Top 5 maior afinidade de voto"
        >
          <Top5Afinidade afinidades={afinidades} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="pares"
          subtitle="Mesmo tema, direções inversas (uma restritiva, outra permissiva), voto idêntico. A plataforma é o espelho — o cidadão tira a conclusão."
          title="Pares de votos em direções opostas"
        >
          <ParesContraditorios
            pares={paresContraditorios}
            stats={coerenciaStats}
          />
        </SectionCard>
      </div>

      {/* Footer cross-links (Wave 7 Sprint 7.2 PR5) — fecha o
          cul-de-sac do perfil: depois de ler tudo, o Cidadão Consciente
          tem 2 caminhos óbvios para continuar explorando: outros
          parlamentares do mesmo partido ou da mesma UF. */}
      <footer className="mt-8 border-border border-t pt-6">
        <p className="text-foreground-muted text-sm">
          Explorar mais parlamentares:
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-background px-3 py-2 font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={`/parlamentares?partido=${encodeURIComponent(parlamentar.partidoSigla)}`}
          >
            Ver outros do {parlamentar.partidoSigla}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-background px-3 py-2 font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={`/parlamentares?uf=${parlamentar.uf}`}
          >
            Ver outros de {parlamentar.uf}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  )
}
