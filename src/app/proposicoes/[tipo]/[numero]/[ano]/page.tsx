// Perfil de proposição — promovido ao RDS (migração ADR-033). Consome o
// design system @fabio.caffarello/react-design-system — tokens traduzidos
// pela tabela canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// por composição nested — NÃO importar aqui.
//
// - Stat/StatGroup (KPIs) + SectionCard (Card compound) do /server;
//   SectionNav (useScrollSpy) de @/design-system/compositions; Accordion
//   mobile via @/design-system/primitives/rds-accordion (/granular).
// - Charts (ApoioPartidoChart, VotosConsolidadosChart — recharts) sobem como
//   resíduo BaV (ADR-034 §5; o donut teve o fix #303/#304 na Fase C, #408).

import {
  Breadcrumb,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import { Clock, FileText, Gavel, Tag, Users } from 'lucide-react'
import { notFound, permanentRedirect } from 'next/navigation'
import {
  DetailLayout,
  type DetailSection,
} from '@/components/detail/detail-layout'
import { ApoioPartidoChart } from '@/components/proposicao/apoio-partido-chart-client'
import { AutoresList } from '@/components/proposicao/autores-list'
import { BarraProgressoTramitacao } from '@/components/proposicao/barra-progresso-tramitacao'
import { FooterCrossLinks } from '@/components/proposicao/footer-cross-links'
import { PerfilProposicaoHeader } from '@/components/proposicao/perfil-header'
import { RelatoriasList } from '@/components/proposicao/relatorias-list'
import { TemasList } from '@/components/proposicao/temas-list'
import { TramitacaoTimeline } from '@/components/proposicao/tramitacao-timeline'
import { VotacoesComissaoSenado } from '@/components/proposicao/votacoes-comissao-senado'
import { VotacoesVinculadas } from '@/components/proposicao/votacoes-vinculadas'
import { VotosConsolidadosChart } from '@/components/proposicao/votos-consolidados-chart-client'
import { decodeCursor } from '@/lib/cursor'
import { formatProposicaoRef } from '@/lib/format'
import { CursorTramitacaoV1 } from '@/lib/queries/cursor-schemas'
import {
  getApoioPorPartido,
  getAutoresByProposicao,
  getProposicaoByChave,
  getTemasByProposicao,
  getTramitacaoByProposicao,
  getVotacoesByProposicao,
  getVotosConsolidados,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
  TRAMITACAO_FILTROS,
  type TramitacaoFiltro,
  VOTACOES_CASA_FILTROS,
  VOTACOES_RESULTADO_FILTROS,
  type VotacoesCasaFiltro,
  type VotacoesResultadoFiltro,
} from '@/lib/queries/proposicoes'
import {
  getProposicoesMesmoAutor,
  getProposicoesMesmoTema,
} from '@/lib/queries/proposicoes-relacionadas'
import { getProposicaoStats } from '@/lib/queries/proposicoes-stats'
import { getRelatoresByProposicao } from '@/lib/queries/relatorias'
import { getVotosResumoPorPartido } from '@/lib/queries/votacoes'
import { getVotacoesComissaoByProposicao } from '@/lib/queries/votacoes-comissao'
import {
  buildKpiSlotsDetalhe,
  type KpiTone,
} from '@/modules/proposicoes/domain/kpi-detalhe'
import {
  inferirMarcoAtual,
  isSituacaoTerminalNegativa,
} from '@/modules/proposicoes/domain/tramitacao-card'

// Tone do Stat (RDS) afeta APENAS o hint — mesmo contrato do KpiStrip
// local. Map estabelecido na piloto-2: default/muted→neutral,
// destructive→error.
const STAT_TONE: Record<KpiTone, 'neutral' | 'success' | 'warning' | 'error'> =
  {
    default: 'neutral',
    success: 'success',
    warning: 'warning',
    destructive: 'error',
    muted: 'neutral',
  }

interface PageProps {
  params: Promise<{ tipo: string; numero: string; ano: string }>
  searchParams: Promise<{
    tram_after?: string
    tram_filtro?: string
    vot_resultado?: string
    vot_casa?: string
  }>
}

function normalizeTramitacaoFiltro(
  value: string | undefined,
): TramitacaoFiltro {
  if (value && TRAMITACAO_FILTROS.includes(value as TramitacaoFiltro)) {
    return value as TramitacaoFiltro
  }
  return 'todos'
}

function normalizeVotacoesResultado(
  value: string | undefined,
): VotacoesResultadoFiltro {
  if (
    value &&
    VOTACOES_RESULTADO_FILTROS.includes(value as VotacoesResultadoFiltro)
  ) {
    return value as VotacoesResultadoFiltro
  }
  return 'todos'
}

function normalizeVotacoesCasa(value: string | undefined): VotacoesCasaFiltro {
  if (value && VOTACOES_CASA_FILTROS.includes(value as VotacoesCasaFiltro)) {
    return value as VotacoesCasaFiltro
  }
  return 'todas'
}

function parseParams(
  raw: Awaited<PageProps['params']>,
): { tipo: TipoProposicao; numero: number; ano: number } | null {
  const tipo = raw.tipo.toUpperCase() as TipoProposicao
  if (!TIPOS_PROPOSICAO.includes(tipo)) return null
  const numero = Number(raw.numero)
  const ano = Number(raw.ano)
  if (!Number.isInteger(numero) || numero <= 0) return null
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) return null
  return { tipo, numero, ano }
}

// Base /rds/ — cursor pagination e filtros permanecem DENTRO da rota
// staging (não vazam pro usuário da rota original).
function buildDetalheHref(
  tipo: string,
  numero: number,
  ano: number,
  params: Awaited<PageProps['searchParams']>,
  override: {
    tram_after?: string | null
    tram_filtro?: string | null
    vot_resultado?: string | null
    vot_casa?: string | null
  },
  anchor = '',
): string {
  const merged = { ...params, ...override }
  const search = new URLSearchParams()
  for (const key of [
    'tram_after',
    'tram_filtro',
    'vot_resultado',
    'vot_casa',
  ] as const) {
    const value = merged[key]
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, value)
    }
  }
  const qs = search.toString()
  const base = `/proposicoes/${tipo}/${numero}/${ano}`
  return `${base}${qs ? `?${qs}` : ''}${anchor}`
}

export async function generateMetadata({ params }: PageProps) {
  const raw = await params
  const parsed = parseParams(raw)
  if (!parsed) return { title: 'Proposição — Brasil à Vera' }
  const p = await getProposicaoByChave(parsed.tipo, parsed.numero, parsed.ano)
  if (!p) return { title: 'Proposição — Brasil à Vera' }
  const ref = formatProposicaoRef(p.tipo, p.numero, p.ano)
  const title = `${ref} — Brasil à Vera`
  const description = p.ementa.slice(0, 200)
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

export default async function ProposicaoDetalhePage({
  params,
  searchParams,
}: PageProps) {
  const raw = await params
  const sp = await searchParams
  const parsed = parseParams(raw)
  if (!parsed) notFound()

  const proposicao = await getProposicaoByChave(
    parsed.tipo,
    parsed.numero,
    parsed.ano,
  )
  if (!proposicao) notFound()

  // Cursor pagination da tramitação (ADR-026 §5).
  // null = token inválido → redirect 308 strip do param. undefined = 1ª pág.
  const cursorTramitacao = decodeCursor(sp.tram_after, CursorTramitacaoV1)
  if (cursorTramitacao === null) {
    permanentRedirect(
      buildDetalheHref(
        parsed.tipo,
        parsed.numero,
        parsed.ano,
        sp,
        { tram_after: null },
        '#tramitacao',
      ),
    )
  }

  const tramitacaoFiltro = normalizeTramitacaoFiltro(sp.tram_filtro)
  const votacoesResultado = normalizeVotacoesResultado(sp.vot_resultado)
  const votacoesCasa = normalizeVotacoesCasa(sp.vot_casa)

  const [
    temas,
    autores,
    votacoes,
    tramitacaoPage,
    stats,
    apoioPartido,
    votosConsolidados,
    relatorias,
    votacoesComissao,
  ] = await Promise.all([
    getTemasByProposicao(proposicao.id),
    getAutoresByProposicao(proposicao.id),
    getVotacoesByProposicao(proposicao.id, {
      resultado: votacoesResultado,
      casa: votacoesCasa,
    }),
    getTramitacaoByProposicao(proposicao.id, {
      cursor: cursorTramitacao,
      filtro: tramitacaoFiltro,
    }),
    getProposicaoStats(proposicao.id),
    getApoioPorPartido(proposicao.id),
    getVotosConsolidados(proposicao.id),
    getRelatoresByProposicao(proposicao.id),
    getVotacoesComissaoByProposicao(proposicao.id),
  ])

  // Resumo de votos por partido para cada votação vinculada.
  // Individualmente cacheado (TTL 7 dias) — parallel após ter os IDs.
  const porPartidoEntries = await Promise.all(
    votacoes.map((v) =>
      getVotosResumoPorPartido(v.id).then((resumo) => [v.id, resumo] as const),
    ),
  )
  const porPartidoMap = Object.fromEntries(porPartidoEntries)

  // 4 slots narrativos do KpiStrip do detalhe (módulo de domínio puro).
  const kpiSlots = buildKpiSlotsDetalhe({
    tipo: proposicao.tipo,
    situacao: proposicao.situacao,
    stats,
  })

  // Barra de progresso da tramitação — só renderiza quando há orgao
  // corrente (sem ele, a inferência de marco vira chute).
  const ultimoOrgao = stats?.ultimoOrgao ?? null
  const barraMarcoAtual = ultimoOrgao
    ? inferirMarcoAtual(ultimoOrgao, proposicao.situacao)
    : null
  const barraTerminalNegativo = isSituacaoTerminalNegativa(proposicao.situacao)

  // Link "Mostrar mais" da tramitação. Restantes só calculável na 1ª
  // página COM filtro='todos'.
  const tramitacaoMostrarMaisHref = tramitacaoPage.nextCursor
    ? buildDetalheHref(
        parsed.tipo,
        parsed.numero,
        parsed.ano,
        sp,
        { tram_after: tramitacaoPage.nextCursor },
        '#tramitacao',
      )
    : null
  const tramitacaoRestantes =
    !cursorTramitacao &&
    tramitacaoFiltro === 'todos' &&
    stats?.nEventosTramitacao
      ? Math.max(0, stats.nEventosTramitacao - tramitacaoPage.rows.length)
      : null

  // buildFiltroHref que reseta cursor ao trocar filtro.
  const buildTramitacaoFiltroHref = (next: TramitacaoFiltro): string =>
    buildDetalheHref(
      parsed.tipo,
      parsed.numero,
      parsed.ano,
      sp,
      {
        tram_after: null,
        tram_filtro: next === 'todos' ? null : next,
      },
      '#tramitacao',
    )

  // buildFiltroHref votações — override parcial; strip no default.
  const buildVotacoesFiltroHref = (override: {
    resultado?: VotacoesResultadoFiltro
    casa?: VotacoesCasaFiltro
  }): string =>
    buildDetalheHref(
      parsed.tipo,
      parsed.numero,
      parsed.ano,
      sp,
      {
        vot_resultado:
          override.resultado !== undefined
            ? override.resultado === 'todos'
              ? null
              : override.resultado
            : undefined,
        vot_casa:
          override.casa !== undefined
            ? override.casa === 'todas'
              ? null
              : override.casa
            : undefined,
      },
      '#votacoes',
    )

  // Fase 2 do fetch para footer cross-links (depende da fase 1).
  const autorPrincipal =
    autores.find(
      (a) => a.tipoAutoria === 'AUTOR' && a.parlamentarId !== null,
    ) ?? null
  const temaCanonico = stats?.temaCanonicoCodigo ?? null

  const [mesmoAutor, mesmoTema] = await Promise.all([
    autorPrincipal?.parlamentarId
      ? getProposicoesMesmoAutor(autorPrincipal.parlamentarId, proposicao.id, 5)
      : Promise.resolve([]),
    temaCanonico !== null
      ? getProposicoesMesmoTema(temaCanonico, proposicao.id, 5)
      : Promise.resolve([]),
  ])

  const sections: DetailSection[] = [
    {
      id: 'temas',
      navLabel: 'Temas',
      icon: <Tag className="h-4 w-4" />,
      content: <TemasList temas={temas} />,
    },
    {
      id: 'relator',
      navLabel: 'Relator',
      icon: <Gavel className="h-4 w-4" />,
      content: <RelatoriasList relatorias={relatorias} />,
    },
    {
      id: 'autores',
      navLabel: 'Autores',
      subtitle:
        'Parlamentares vinculados levam ao seu perfil 360°. Comissões, mesas e demais autores não-individuais aparecem só como nome.',
      icon: <Users className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          {apoioPartido.length > 0 ? (
            <ApoioPartidoChart data={apoioPartido} />
          ) : null}
          <AutoresList autores={autores} />
        </div>
      ),
    },
    {
      id: 'votacoes',
      navLabel: 'Votações',
      title: 'Votações vinculadas',
      subtitle:
        'Votações conhecidamente associadas a esta proposição. Para votações nominais detalhadas (voto por parlamentar), navegue até a página da votação correspondente.',
      icon: <FileText className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          {votosConsolidados ? (
            <VotosConsolidadosChart data={votosConsolidados} />
          ) : null}
          <VotacoesVinculadas
            buildFiltroHref={buildVotacoesFiltroHref}
            casa={votacoesCasa}
            porPartidoMap={porPartidoMap}
            resultado={votacoesResultado}
            votacoes={votacoes}
          />
          <VotacoesComissaoSenado votacoes={votacoesComissao} />
        </div>
      ),
    },
    {
      id: 'tramitacao',
      navLabel: 'Tramitação',
      subtitle:
        'Histórico de movimentação da proposição, do evento mais recente para o mais antigo. Despachos completos disponíveis em cada evento quando agregam contexto.',
      icon: <Clock className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          {barraMarcoAtual !== null && ultimoOrgao !== null ? (
            <BarraProgressoTramitacao
              ariaLabel={`Tramitação em ${ultimoOrgao}`}
              currentStep={barraMarcoAtual}
              terminalNegativo={barraTerminalNegativo}
              variant="full"
            />
          ) : null}
          <TramitacaoTimeline
            buildFiltroHref={buildTramitacaoFiltroHref}
            eventos={tramitacaoPage.rows}
            filtro={tramitacaoFiltro}
            mostrarMaisHref={tramitacaoMostrarMaisHref}
            restantes={tramitacaoRestantes}
          />
        </div>
      ),
    },
  ]

  return (
    <DetailLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Proposições', href: '/proposicoes' },
            {
              label: formatProposicaoRef(
                proposicao.tipo,
                proposicao.numero,
                proposicao.ano,
              ),
            },
          ]}
        />
      }
      defaultOpenMobile={['tramitacao', 'relator', 'autores']}
      footer={
        <FooterCrossLinks
          autorPrincipalNome={autorPrincipal?.nome ?? null}
          mesmoAutor={mesmoAutor}
          mesmoTema={mesmoTema}
        />
      }
      header={
        <PerfilProposicaoHeader
          proposicao={{
            tipo: proposicao.tipo,
            numero: proposicao.numero,
            ano: proposicao.ano,
            ementa: proposicao.ementa,
            ementaDetalhada: proposicao.ementaDetalhada,
            situacao: proposicao.situacao,
            regime: proposicao.regime,
            sourceUrl: proposicao.sourceUrl,
            trustLevel: proposicao.trustLevel,
          }}
          stats={
            stats
              ? {
                  diasEmTramitacao: stats.diasEmTramitacao,
                  nAutores: stats.nAutores,
                }
              : null
          }
        />
      }
      mobileOrder={['tramitacao', 'relator', 'autores', 'votacoes', 'temas']}
      sections={sections}
      stats={
        <StatGroup
          className="overflow-hidden rounded-lg border border-line-default"
          cols={4}
          layout="grid"
        >
          {kpiSlots.map((slot) => (
            <Stat
              hint={slot.hint}
              key={slot.label}
              label={slot.label}
              tone={STAT_TONE[slot.tone ?? 'default']}
              value={slot.value}
            />
          ))}
        </StatGroup>
      }
    />
  )
}
