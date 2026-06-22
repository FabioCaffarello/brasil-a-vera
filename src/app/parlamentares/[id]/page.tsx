// Perfil de parlamentar — promovido ao RDS (migração ADR-033). Consome o
// design system @fabio.caffarello/react-design-system — tokens traduzidos
// pela tabela canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// - Stat/StatGroup (KPIs) do /server; SectionCard (Card compound) do /server;
//   SectionNav (useScrollSpy via entry /hooks) de @/design-system/compositions.
// - Accordion mobile: Accordion do RDS via entry /granular (wrapper client
//   @/design-system/primitives/rds-accordion — tree-shaking poda o barrel).
// - Charts (GastosChart, recharts) sobem como resíduo BaV (ADR-034 §5).

import { Stat, StatGroup } from '@fabio.caffarello/react-design-system/server'
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  FileText,
  Gavel,
  GitBranch,
  Inbox,
  Landmark,
  Network,
  PieChart,
  ScrollText,
  TrendingDown,
  TrendingUp,
  Users,
  Vote,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { Top5Afinidade } from '@/components/parlamentar/afinidade-voto'
import { AlinhamentoBancada } from '@/components/parlamentar/alinhamento'
import { AlinhamentoBlocos } from '@/components/parlamentar/alinhamento-blocos'
import { ComissoesMembro } from '@/components/parlamentar/comissoes-membro'
import { EvolucaoPatrimonialBlock } from '@/components/parlamentar/evolucao-patrimonial'
import { FidelidadePartidaria } from '@/components/parlamentar/fidelidade'
import { GastosResumoBlock } from '@/components/parlamentar/gastos-resumo'
import { GrafoParticipacaoBlock } from '@/components/parlamentar/grafo-participacao'
import { MixComposicaoBlock } from '@/components/parlamentar/mix-composicao'
import { ParesContraditorios } from '@/components/parlamentar/pares-contraditorios'
import { PatrimonioBlock } from '@/components/parlamentar/patrimonio'
import { PerfilHeader } from '@/components/parlamentar/perfil-header'
import { Presenca } from '@/components/parlamentar/presenca'
import { ProposicoesAutor } from '@/components/parlamentar/proposicoes-autor'
import { Relatorias } from '@/components/parlamentar/relatorias'
import { VotosRecentes } from '@/components/parlamentar/votos-recentes'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import { Accordion } from '@/design-system/primitives/rds-accordion'
import { decodeCursor } from '@/lib/cursor'
import { formatBRL } from '@/lib/format'
import {
  getAlinhamentoBlocos,
  getAlinhamentoParlamentar,
} from '@/lib/queries/alinhamento'
import {
  getCoerenciaStats,
  getParesContraditorios,
} from '@/lib/queries/coerencia'
import { getComissoesParlamentar } from '@/lib/queries/comissoes'
import {
  CursorProposicoesV1,
  CursorVotosV1,
} from '@/lib/queries/cursor-schemas'
import {
  getFidelidadeBancada,
  getFidelidadeOrientacao,
  getTimelineMigracao,
} from '@/lib/queries/fidelidade'
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
import {
  getEvolucaoPatrimonial,
  getGrafoParticipacao,
  getPatrimonioSnapshot,
} from '@/lib/queries/patrimonio'
import { getPresencaPlenario } from '@/lib/queries/presenca'
import {
  getRelatorAutoria,
  getRelatoriasInfluencia,
} from '@/lib/queries/relatorias'
import { buildMixComposicao } from '@/modules/eleitoral/domain/mix'

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

// Base /rds/ — paginação por cursor e filtros permanecem DENTRO da rota
// staging (não vazam pro usuário da rota original).
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
    alinhamentoBlocos,
    comparacoes,
    patrimonio,
    evolucaoPatrimonial,
    grafoParticipacao,
    comissoes,
    fidelidadeTimeline,
    fidelidadeBancada,
    fidelidadeOrientacao,
    relatoriasInfluencia,
    relatorAutoria,
    presenca,
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
    // Alinhamento com Governo/Oposição existe só na Câmara (ADR-040); para
    // senador resolve vazio e a UI mostra a nota de assimetria da fonte.
    parlamentar.casa === 'CAMARA'
      ? getAlinhamentoBlocos(parlamentar.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof getAlinhamentoBlocos>>),
    getComparacoesCasa(parlamentar.id),
    getPatrimonioSnapshot(parlamentar.id),
    getEvolucaoPatrimonial(parlamentar.id),
    getGrafoParticipacao(parlamentar.id),
    getComissoesParlamentar(parlamentar.id),
    getTimelineMigracao(parlamentar.id),
    getFidelidadeBancada(parlamentar.id),
    getFidelidadeOrientacao(parlamentar.id),
    // Relatorias: Câmara e Senado (ADR-044 emenda 2026-06-21). Casa-agnóstico —
    // conta por parlamentar_id.
    getRelatoriasInfluencia(parlamentar.id),
    getRelatorAutoria(parlamentar.id),
    getPresencaPlenario(parlamentar.id),
  ])

  // Camada C deriva da evolução (mesma query) — mix % é imune ao IPCA.
  const mixComposicao = buildMixComposicao(evolucaoPatrimonial)

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
        // Anchor no próprio botão (que existe na próxima página também)
        // mantém scroll position visual em vez de saltar pro topo da seção.
        '#mostrar-mais-votos',
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
        '#mostrar-mais-propos',
      )
    : null

  // Tone do Stat (RDS): afeta APENAS o hint (mesmo contrato do KpiStrip
  // original). Map KpiTone→StatTone: default/muted→neutral (nuance:
  // hint muted original era fg-quaternary; Stat neutral é fg-tertiary),
  // destructive→error.
  const alinhamentoTone =
    alinhamento.percentual === null
      ? 'neutral'
      : alinhamento.percentual >= 80
        ? 'success'
        : alinhamento.percentual >= 50
          ? 'neutral'
          : 'warning'

  // Seção de alinhamento com Governo/Oposição (ADR-040). Câmara-only; no
  // Senado a fonte não publica orientação — nota de assimetria, sem substituto.
  const alinhamentoBlocosContent =
    parlamentar.casa === 'SENADO' ? (
      <p className="text-fg-tertiary text-sm">
        A fonte do Senado não publica orientação de bancada nem de bloco
        (Governo/Oposição) em endpoint público. Esta comparação existe apenas
        para deputados federais (Câmara).
      </p>
    ) : (
      <AlinhamentoBlocos blocos={alinhamentoBlocos} />
    )

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

        {/* StatGroup do RDS substitui o KpiStrip local. Borda externa +
            rounded adicionados via className para paridade com o strip
            original (StatGroup só traz os dividers internos). */}
        <StatGroup
          className="overflow-hidden rounded-lg border border-line-default"
          cols={4}
          layout="grid"
        >
          <Stat
            icon={<Vote className="h-4 w-4" />}
            label="Alinhamento à bancada"
            tone={alinhamentoTone}
            value={
              alinhamento.percentual === null
                ? '—'
                : `${alinhamento.percentual}%`
            }
            hint={
              <>
                {alinhamento.emFederacao
                  ? 'orientação publicada pela federação'
                  : alinhamento.total > 0
                    ? `${alinhamento.alinhados}/${alinhamento.total} com orientação`
                    : 'sem orientação no período'}
                {comparacoes.medianaAlinhamentoCasa !== null ? (
                  <>
                    {' · '}
                    <span className="text-fg-quaternary">
                      mediana da {casaLabel(parlamentar.casa)} em{' '}
                      {Math.round(comparacoes.medianaAlinhamentoCasa)}%
                    </span>
                  </>
                ) : null}
              </>
            }
          />
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Votações analisadas"
            value={alinhamento.total > 0 ? alinhamento.total : votos.length}
            hint={
              alinhamento.total > 0 ? 'com orientação' : 'recentes (nominais)'
            }
          />
          <Stat
            icon={<Inbox className="h-4 w-4" />}
            label="Proposições como autor"
            value={proposicoes.length}
            hint={
              <>
                {proposicoesPage.nextCursor ? 'primeira página' : ''}
                {comparacoes.percentilProposicoesCasa !== null ? (
                  <>
                    {proposicoesPage.nextCursor ? ' · ' : ''}
                    <span className="text-fg-quaternary">
                      {formatPercentil(comparacoes.percentilProposicoesCasa)} da{' '}
                      {casaLabel(parlamentar.casa)}
                    </span>
                  </>
                ) : null}
              </>
            }
          />
          <Stat
            icon={<TrendingDown className="h-4 w-4" />}
            label={`Gastos CEAP ${anoCorrente}`}
            value={
              gastos.totalRegistros === 0 ? '—' : formatBRL(gastos.totalGeral)
            }
            hint={
              <>
                {gastos.totalRegistros === 0
                  ? 'sem gastos registrados'
                  : `${gastos.totalRegistros} registros`}
                {comparacoes.percentilGastoCasa !== null &&
                gastos.totalRegistros > 0 ? (
                  <>
                    {' · '}
                    <span className="text-fg-quaternary">
                      {formatPercentil(comparacoes.percentilGastoCasa)} da{' '}
                      {casaLabel(parlamentar.casa)}
                    </span>
                  </>
                ) : null}
              </>
            }
          />
        </StatGroup>
      </div>

      {/* SectionNav só desktop — no mobile o Accordion abaixo já é a nav. */}
      <SectionNav
        className="mt-6 hidden sm:block"
        items={[
          { id: 'votos', label: 'Votos', icon: <Vote className="h-4 w-4" /> },
          {
            id: 'presenca',
            label: 'Presença',
            icon: <CalendarCheck className="h-4 w-4" />,
          },
          {
            id: 'alinhamento',
            label: 'Alinhamento',
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: 'alinhamento-blocos',
            label: 'Gov/Oposição',
            icon: <Landmark className="h-4 w-4" />,
          },
          {
            id: 'voto-partido',
            label: 'Trajetória',
            icon: <GitBranch className="h-4 w-4" />,
          },
          {
            id: 'comissoes',
            label: 'Comissões',
            icon: <Gavel className="h-4 w-4" />,
          },
          {
            id: 'relatorias',
            label: 'Relatorias',
            icon: <ScrollText className="h-4 w-4" />,
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
          ...(patrimonio
            ? [
                {
                  id: 'patrimonio',
                  label: 'Patrimônio',
                  icon: <Building2 className="h-4 w-4" />,
                },
              ]
            : []),
          ...(evolucaoPatrimonial
            ? [
                {
                  id: 'evolucao-patrimonio',
                  label: 'Evolução',
                  icon: <TrendingUp className="h-4 w-4" />,
                },
              ]
            : []),
          ...(mixComposicao
            ? [
                {
                  id: 'mix-patrimonio',
                  label: 'Composição',
                  icon: <PieChart className="h-4 w-4" />,
                },
              ]
            : []),
          ...(grafoParticipacao
            ? [
                {
                  id: 'grafo-participacao',
                  label: 'Empresas',
                  icon: <Network className="h-4 w-4" />,
                },
              ]
            : []),
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

      {/* Mobile: Accordion do RDS via entry /granular (3.9.0, #209 fecha
          RDS #208 — preserveModules; só o módulo do Accordion atravessa o
          client boundary). Componente do #204: painel sem clamp
          (grid-template-rows 0fr→1fr) + className/triggerClassName por
          item. Radix local aposentado nesta rota. Header + Votos +
          Alinhamento default-expanded como no original. */}
      <Accordion
        className="mt-6 space-y-3 sm:hidden"
        defaultOpen={['votos', 'alinhamento']}
        type="multiple"
        items={[
          {
            id: 'votos',
            title: 'Votos recentes',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <VotosRecentes
                votos={votos}
                filtros={votosFiltros}
                distribuicao={votosDistribuicao}
                buildFiltroHref={buildVotosFiltroHref}
                proximaPaginaHref={votosProximaPaginaHref}
              />
            ),
          },
          {
            id: 'presenca',
            title: 'Presença em plenário',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: <Presenca presenca={presenca} casa={parlamentar.casa} />,
          },
          {
            id: 'alinhamento',
            title: 'Alinhamento à bancada',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <AlinhamentoBancada
                alinhamento={alinhamento}
                casa={parlamentar.casa}
                mensal={alinhamentoMensal}
              />
            ),
          },
          {
            id: 'alinhamento-blocos',
            title: 'Alinhamento com Governo e Oposição',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: alinhamentoBlocosContent,
          },
          {
            id: 'voto-partido',
            title: 'Voto e partido ao longo do mandato',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <FidelidadePartidaria
                timeline={fidelidadeTimeline}
                bancada={fidelidadeBancada}
                orientacao={fidelidadeOrientacao}
              />
            ),
          },
          {
            id: 'comissoes',
            title: 'Comissões',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: <ComissoesMembro {...comissoes} />,
          },
          {
            id: 'relatorias',
            title: 'Relatorias',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <Relatorias
                influencia={relatoriasInfluencia}
                autoria={relatorAutoria}
                casa={parlamentar.casa}
              />
            ),
          },
          {
            id: 'proposicoes',
            title: 'Proposições onde é autor ou coautor',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <ProposicoesAutor
                proposicoes={proposicoes}
                filtros={proposicoesFiltros}
                buildFiltroHref={buildProposicoesFiltroHref}
                proximaPaginaHref={proposicoesProximaPaginaHref}
              />
            ),
          },
          {
            id: 'gastos',
            title: `Gastos parlamentares — ${anoCorrente}`,
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <GastosResumoBlock
                ano={anoCorrente}
                mensal={gastosMensal}
                resumo={gastos}
              />
            ),
          },
          ...(patrimonio
            ? [
                {
                  id: 'patrimonio',
                  title: 'Patrimônio declarado',
                  className: 'rounded-lg border-line-default bg-surface-base',
                  triggerClassName: 'font-semibold text-base',
                  content: <PatrimonioBlock snapshot={patrimonio} />,
                },
              ]
            : []),
          ...(evolucaoPatrimonial
            ? [
                {
                  id: 'evolucao-patrimonio',
                  title: 'Evolução patrimonial entre pleitos',
                  className: 'rounded-lg border-line-default bg-surface-base',
                  triggerClassName: 'font-semibold text-base',
                  content: (
                    <EvolucaoPatrimonialBlock evolucao={evolucaoPatrimonial} />
                  ),
                },
              ]
            : []),
          ...(mixComposicao
            ? [
                {
                  id: 'mix-patrimonio',
                  title: 'Composição patrimonial ao longo do tempo',
                  className: 'rounded-lg border-line-default bg-surface-base',
                  triggerClassName: 'font-semibold text-base',
                  content: <MixComposicaoBlock mix={mixComposicao} />,
                },
              ]
            : []),
          ...(grafoParticipacao
            ? [
                {
                  id: 'grafo-participacao',
                  title: 'Participação societária',
                  className: 'rounded-lg border-line-default bg-surface-base',
                  triggerClassName: 'font-semibold text-base',
                  content: (
                    <GrafoParticipacaoBlock
                      grafo={grafoParticipacao}
                      parlamentarNome={parlamentar.nome}
                    />
                  ),
                },
              ]
            : []),
          {
            id: 'afinidade',
            title: 'Top 5 maior afinidade de voto',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: <Top5Afinidade afinidades={afinidades} />,
          },
          {
            id: 'pares',
            title: 'Pares de votos em direções opostas',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <ParesContraditorios
                pares={paresContraditorios}
                stats={coerenciaStats}
              />
            ),
          },
        ]}
      />

      {/* Desktop: stack linear de SectionCards (Card compound do RDS —
          ver @/design-system/compositions/section-card.tsx). Anchors do scroll-spy
          preservados. */}
      <div className="mt-6 hidden space-y-5 sm:block">
        <SectionCard
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
          id="presenca"
          subtitle="Presença em votações nominais de plenário, no período de mandato. Não inclui comissões nem votações simbólicas. Câmara infere a ausência (sem registro nominal); Senado a registra."
          title="Presença em plenário"
        >
          <Presenca presenca={presenca} casa={parlamentar.casa} />
        </SectionCard>

        <SectionCard
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
          id="alinhamento-blocos"
          subtitle="Comparação factual entre o voto individual e a orientação formalizada pelas lideranças do Governo e da Oposição na Câmara. Referência de leitura, não juízo de valor."
          title="Alinhamento com Governo e Oposição"
        >
          {alinhamentoBlocosContent}
        </SectionCard>

        <SectionCard
          id="voto-partido"
          subtitle="Compara cada voto com duas referências do partido vigente na data do voto — a orientação da liderança e a maioria efetiva da bancada — considerando as trocas de partido. Referência factual, sem juízo de valor."
          title="Voto e partido ao longo do mandato"
        >
          <FidelidadePartidaria
            timeline={fidelidadeTimeline}
            bancada={fidelidadeBancada}
            orientacao={fidelidadeOrientacao}
          />
        </SectionCard>

        <SectionCard
          id="comissoes"
          subtitle="Comissões nesta legislatura (57ª). 'Atualmente' = vínculo ativo hoje; o histórico cobre só o mandato corrente."
          title="Comissões"
        >
          <ComissoesMembro {...comissoes} />
        </SectionCard>

        <SectionCard
          id="relatorias"
          subtitle="Proposições em que é o relator vigente/último (designação institucional, não escolha do parlamentar) e a distribuição partidária dos autores dessas proposições. Câmara-only; referência factual, sem juízo."
          title="Relatorias"
        >
          <Relatorias
            influencia={relatoriasInfluencia}
            autoria={relatorAutoria}
            casa={parlamentar.casa}
          />
        </SectionCard>

        <SectionCard
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

        {patrimonio ? (
          <SectionCard
            id="patrimonio"
            subtitle="Bens declarados ao TSE na candidatura de 2022. Vínculo por CPF exato — só aparece para parlamentares da Câmara identificados na base do TSE."
            title="Patrimônio declarado"
          >
            <PatrimonioBlock snapshot={patrimonio} />
          </SectionCard>
        ) : null}

        {evolucaoPatrimonial ? (
          <SectionCard
            id="evolucao-patrimonio"
            subtitle="Como o patrimônio declarado variou entre as candidaturas. Valores corrigidos pela inflação (IPCA) para comparação justa; pontos discretos — o intervalo entre pleitos é desconhecido."
            title="Evolução patrimonial entre pleitos"
          >
            <EvolucaoPatrimonialBlock evolucao={evolucaoPatrimonial} />
          </SectionCard>
        ) : null}

        {mixComposicao ? (
          <SectionCard
            id="mix-patrimonio"
            subtitle="Para onde o patrimônio migrou entre as candidaturas. Composição em %, imune à inflação — isola a mudança de mix dos valores absolutos."
            title="Composição patrimonial ao longo do tempo"
          >
            <MixComposicaoBlock mix={mixComposicao} />
          </SectionCard>
        ) : null}

        {grafoParticipacao ? (
          <SectionCard
            id="grafo-participacao"
            subtitle="Empresas em que o parlamentar declarou participação societária (quotas/ações). Extraído da descrição do TSE; só o que foi declarado, sem consulta externa."
            title="Participação societária"
          >
            <GrafoParticipacaoBlock
              grafo={grafoParticipacao}
              parlamentarNome={parlamentar.nome}
            />
          </SectionCard>
        ) : null}

        <SectionCard
          id="afinidade"
          subtitle="Outros parlamentares que mais coincidem no voto. Mostra concordância prática, não alinhamento ideológico declarado."
          title="Top 5 maior afinidade de voto"
        >
          <Top5Afinidade afinidades={afinidades} />
        </SectionCard>

        <SectionCard
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

      {/* Footer cross-links — fecha o cul-de-sac do perfil. Apontam para
          as listagens de PRODUÇÃO (fora do escopo da staging). */}
      <footer className="mt-8 border-line-default border-t pt-6">
        <p className="text-fg-tertiary text-sm">Explorar mais parlamentares:</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
            href={`/parlamentares?partido=${encodeURIComponent(parlamentar.partidoSigla)}`}
          >
            Ver outros do {parlamentar.partidoSigla}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
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
