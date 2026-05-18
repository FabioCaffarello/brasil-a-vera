import {
  ArrowRight,
  FileText,
  Inbox,
  TrendingDown,
  Users,
  Vote,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
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
import { decodeCursor } from '@/lib/cursor'
import { formatBRL } from '@/lib/format'
import { getAlinhamentoParlamentar } from '@/lib/queries/alinhamento'
import {
  getCoerenciaStats,
  getParesContraditorios,
} from '@/lib/queries/coerencia'
import {
  CursorProposicoesV1,
  CursorVotosV1,
} from '@/lib/queries/cursor-schemas'
import {
  getAlinhamentoMensal,
  getComparacoesCasa,
  getGastosMensalMedianaCasa,
  getGastosResumo,
  getGastosTopFornecedores,
  getParlamentarById,
  getProposicoesAutoradas,
  getTop5Afinidade,
  getVotosDistribuicao,
  getVotosRecentes,
  PROPOSICAO_SITUACOES,
  PROPOSICAO_TIPOS,
  type ProposicaoSituacaoFilter,
  type ProposicaoTipoFilter,
  VOTOS_ALINHAMENTOS,
  VOTOS_PERIODOS,
  type VotosAlinhamentoFilter,
  type VotosPeriodoFilter,
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
  searchParams: Promise<{
    votos_after?: string
    votos_periodo?: string
    votos_alinhamento?: string
    propos_after?: string
    propos_tipo?: string
    propos_situacao?: string
  }>
}

function normalizeVotosPeriodo(
  v: string | undefined,
): VotosPeriodoFilter | undefined {
  if (v && (VOTOS_PERIODOS as string[]).includes(v)) {
    return v as VotosPeriodoFilter
  }
  return undefined
}

function normalizeVotosAlinhamento(
  v: string | undefined,
): VotosAlinhamentoFilter | undefined {
  if (v && (VOTOS_ALINHAMENTOS as string[]).includes(v)) {
    return v as VotosAlinhamentoFilter
  }
  return undefined
}

function normalizeProposicaoTipo(
  v: string | undefined,
): ProposicaoTipoFilter | undefined {
  if (v && (PROPOSICAO_TIPOS as string[]).includes(v)) {
    return v as ProposicaoTipoFilter
  }
  return undefined
}

function normalizeProposicaoSituacao(
  v: string | undefined,
): ProposicaoSituacaoFilter | undefined {
  if (v && (PROPOSICAO_SITUACOES as string[]).includes(v)) {
    return v as ProposicaoSituacaoFilter
  }
  return undefined
}

function buildPerfilHref(
  parlamentarId: string,
  searchParams: Record<string, string | undefined>,
  overrides: Record<string, string | null | undefined>,
  anchor?: string,
): string {
  const merged: Record<string, string | undefined | null> = {
    ...searchParams,
    ...overrides,
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const suffix = `${qs ? `?${qs}` : ''}${anchor ?? ''}`
  return `/parlamentares/${parlamentarId}${suffix}`
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

export default async function ParlamentarPerfilPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) notFound()

  // Cursors (ADR-026): null = inválido → redirect 308 strip o param.
  const cursorVotos = decodeCursor(sp.votos_after, CursorVotosV1)
  if (cursorVotos === null) {
    permanentRedirect(
      buildPerfilHref(parlamentar.id, sp, { votos_after: null }, '#votos'),
    )
  }
  const cursorPropos = decodeCursor(sp.propos_after, CursorProposicoesV1)
  if (cursorPropos === null) {
    permanentRedirect(
      buildPerfilHref(
        parlamentar.id,
        sp,
        { propos_after: null },
        '#proposicoes',
      ),
    )
  }
  const periodoVotos = normalizeVotosPeriodo(sp.votos_periodo)
  const alinhamentoVotos = normalizeVotosAlinhamento(sp.votos_alinhamento)
  const tipoPropos = normalizeProposicaoTipo(sp.propos_tipo)
  const situacaoPropos = normalizeProposicaoSituacao(sp.propos_situacao)

  const anoCorrente = new Date().getFullYear()
  const [
    votosPage,
    votosDistribuicao,
    proposicoesPage,
    gastos,
    gastosMensal,
    gastosTopFornecedores,
    afinidades,
    paresContraditorios,
    coerenciaStats,
    alinhamento,
    alinhamentoMensal,
    comparacoes,
  ] = await Promise.all([
    getVotosRecentes(parlamentar.id, {
      cursor: cursorVotos,
      periodo: periodoVotos,
      alinhamento: alinhamentoVotos,
    }),
    getVotosDistribuicao(parlamentar.id, {
      periodo: periodoVotos,
      alinhamento: alinhamentoVotos,
    }),
    getProposicoesAutoradas(parlamentar.id, {
      cursor: cursorPropos,
      tipo: tipoPropos,
      situacao: situacaoPropos,
    }),
    getGastosResumo(parlamentar.id, anoCorrente),
    getGastosMensalMedianaCasa(parlamentar.id, anoCorrente),
    getGastosTopFornecedores(parlamentar.id, anoCorrente, 5),
    getTop5Afinidade(parlamentar.id),
    getParesContraditorios(parlamentar.id, 10),
    getCoerenciaStats(parlamentar.id),
    getAlinhamentoParlamentar(parlamentar.id),
    getAlinhamentoMensal(parlamentar.id, 12),
    getComparacoesCasa(parlamentar.id),
  ])

  const votos = votosPage.rows
  const votosFiltros = {
    periodo: periodoVotos ?? 'all',
    alinhamento: alinhamentoVotos ?? 'todos',
  } as const
  const buildVotosFiltroHref = (overrides: Record<string, string | null>) => {
    const mapped: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(overrides)) {
      mapped[`votos_${k}`] = v
    }
    // Reset cursor ao mudar filtro — não faz sentido manter `votos_after`
    // apontando pra dado que não casa com os filtros novos.
    return buildPerfilHref(
      parlamentar.id,
      sp,
      { ...mapped, votos_after: null },
      '#votos',
    )
  }
  const votosProximaPaginaHref = votosPage.nextCursor
    ? buildPerfilHref(
        parlamentar.id,
        sp,
        { votos_after: votosPage.nextCursor },
        '#votos',
      )
    : null

  const proposicoes = proposicoesPage.rows
  const proposicoesFiltros = {
    tipo: tipoPropos ?? 'todos',
    situacao: situacaoPropos ?? 'todas',
  } as const
  const buildProposicoesFiltroHref = (
    overrides: Record<string, string | null>,
  ) => {
    const mapped: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(overrides)) {
      mapped[`propos_${k}`] = v
    }
    return buildPerfilHref(
      parlamentar.id,
      sp,
      { ...mapped, propos_after: null },
      '#proposicoes',
    )
  }
  const proposicoesProximaPaginaHref = proposicoesPage.nextCursor
    ? buildPerfilHref(
        parlamentar.id,
        sp,
        { propos_after: proposicoesPage.nextCursor },
        '#proposicoes',
      )
    : null

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
                  {proposicoesPage.nextCursor ? 'primeira página' : ''}
                  {comparacoes.percentilProposicoesCasa !== null ? (
                    <>
                      {proposicoesPage.nextCursor ? ' · ' : ''}
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
            <VotosRecentes
              votos={votos}
              filtros={votosFiltros}
              distribuicao={votosDistribuicao}
              buildFiltroHref={buildVotosFiltroHref}
              proximaPaginaHref={votosProximaPaginaHref}
            />
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
              mensal={alinhamentoMensal}
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
            <ProposicoesAutor
              proposicoes={proposicoes}
              filtros={proposicoesFiltros}
              buildFiltroHref={buildProposicoesFiltroHref}
              proximaPaginaHref={proposicoesProximaPaginaHref}
            />
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
            <GastosResumoBlock
              ano={anoCorrente}
              mensal={gastosMensal}
              resumo={gastos}
            />
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
          <VotosRecentes
            votos={votos}
            filtros={votosFiltros}
            distribuicao={votosDistribuicao}
            buildFiltroHref={buildVotosFiltroHref}
            proximaPaginaHref={votosProximaPaginaHref}
          />
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
            mensal={alinhamentoMensal}
          />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="proposicoes"
          subtitle="Limitado às proposições já ingeridas no Brasil à Vera. Pode não refletir toda a produção legislativa histórica do parlamentar."
          title="Proposições onde é autor ou coautor"
        >
          <ProposicoesAutor
            proposicoes={proposicoes}
            filtros={proposicoesFiltros}
            buildFiltroHref={buildProposicoesFiltroHref}
            proximaPaginaHref={proposicoesProximaPaginaHref}
          />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="gastos"
          subtitle="Cota para Exercício da Atividade Parlamentar (CEAP) reportada pela Câmara. Senado tem regime próprio, ainda não ingerido."
          title={`Gastos parlamentares — ${anoCorrente}`}
        >
          <GastosResumoBlock
            ano={anoCorrente}
            mensal={gastosMensal}
            parlamentarId={parlamentar.id}
            resumo={gastos}
            topFornecedores={gastosTopFornecedores}
          />
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
