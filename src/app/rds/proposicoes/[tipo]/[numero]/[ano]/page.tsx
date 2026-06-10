// Rota piloto-3: cópia-rds de /proposicoes/[tipo]/[numero]/[ano] sob
// /rds/ — segundo perfil de detalhe do trio, repetindo o padrão da
// piloto-2 (/rds/parlamentares/[id]). Convive em paralelo com a rota
// original (strangler fig); promoção é decisão futura.
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// por composição nested — NÃO importar aqui.
//
// Substituições estruturais (mesmas da piloto-2; ver §3.9 do
// route-readiness.md para os workarounds com relógio):
// - KpiStrip → StatGroup + Stat do /server (tone map estabelecido)
// - SectionCard → cópia local sobre Card compound (reuso piloto-2)
// - SectionNav → cópia local com IntersectionObserver (RDS #203)
// - Accordion mobile: primitiva Radix LOCAL (RDS #202)
// - Charts (recharts, dynamic ssr:false) importados dos originais —
//   client islands compartilhados, sem tradução neste PR.
//
// Tradução de classnames segue EXCLUSIVAMENTE
// `docs/migration/token-map.md` (+ extensão piloto-3).

import { Stat, StatGroup } from '@fabio.caffarello/react-design-system/server'
import { Clock, FileText, Tag, Users } from 'lucide-react'
import { notFound, permanentRedirect } from 'next/navigation'

import { ApoioPartidoChart } from '@/components/proposicao/apoio-partido-chart-client'
import { VotosConsolidadosChart } from '@/components/proposicao/votos-consolidados-chart-client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/design-system/primitives/accordion'
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
import {
  buildKpiSlotsDetalhe,
  type KpiTone,
} from '@/modules/proposicoes/domain/kpi-detalhe'
import {
  inferirMarcoAtual,
  isSituacaoTerminalNegativa,
} from '@/modules/proposicoes/domain/tramitacao-card'

import { AutoresList } from './_components/autores-list'
import { BarraProgressoTramitacao } from './_components/barra-progresso-tramitacao'
import { FooterCrossLinks } from './_components/footer-cross-links'
import { PerfilProposicaoHeader } from './_components/perfil-header'
import { SectionCard } from './_components/section-card'
import { SectionNav } from './_components/section-nav'
import { TemasList } from './_components/temas-list'
import { TramitacaoTimeline } from './_components/tramitacao-timeline'
import { VotacoesVinculadas } from './_components/votacoes-vinculadas'

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
  const base = `/rds/proposicoes/${tipo}/${numero}/${ano}`
  return `${base}${qs ? `?${qs}` : ''}${anchor}`
}

export async function generateMetadata({ params }: PageProps) {
  const raw = await params
  const parsed = parseParams(raw)
  if (!parsed) return { title: 'Proposição (rds-pilot) — Brasil à Vera' }
  const p = await getProposicaoByChave(parsed.tipo, parsed.numero, parsed.ano)
  if (!p) return { title: 'Proposição (rds-pilot) — Brasil à Vera' }
  const ref = formatProposicaoRef(p.tipo, p.numero, p.ano)
  const title = `${ref} (rds-pilot) — Brasil à Vera`
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
  ])

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
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

      {/* StatGroup do RDS substitui o KpiStrip local (padrão piloto-2:
          borda externa via className; StatGroup só traz dividers). */}
      <StatGroup
        className="mt-6 overflow-hidden rounded-lg border border-line-default"
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

      {/* SectionNav só desktop — no mobile o Accordion abaixo já é a nav. */}
      <SectionNav
        className="mt-6 hidden sm:block"
        items={[
          { id: 'temas', label: 'Temas', icon: <Tag className="h-4 w-4" /> },
          {
            id: 'autores',
            label: 'Autores',
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: 'votacoes',
            label: 'Votações',
            icon: <FileText className="h-4 w-4" />,
          },
          {
            id: 'tramitacao',
            label: 'Tramitação',
            icon: <Clock className="h-4 w-4" />,
          },
        ]}
        stickyTop="3.5rem"
      />

      {/* Mobile: Accordion colapsável — primitiva Radix LOCAL (RDS #202;
          ver §3.9). defaultValue narrativo preservado do original. */}
      <Accordion
        className="mt-6 space-y-3 sm:hidden"
        defaultValue={['tramitacao', 'autores']}
        type="multiple"
      >
        <AccordionItem
          className="rounded-lg border-line-default bg-surface-base px-4"
          value="tramitacao"
        >
          <AccordionTrigger className="font-semibold text-base">
            Tramitação
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-line-default bg-surface-base px-4"
          value="autores"
        >
          <AccordionTrigger className="font-semibold text-base">
            Autores
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            {apoioPartido.length > 0 ? (
              <ApoioPartidoChart data={apoioPartido} />
            ) : null}
            <AutoresList autores={autores} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-line-default bg-surface-base px-4"
          value="votacoes"
        >
          <AccordionTrigger className="font-semibold text-base">
            Votações vinculadas
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            {votosConsolidados ? (
              <VotosConsolidadosChart data={votosConsolidados} />
            ) : null}
            <VotacoesVinculadas
              buildFiltroHref={buildVotacoesFiltroHref}
              casa={votacoesCasa}
              resultado={votacoesResultado}
              votacoes={votacoes}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-line-default bg-surface-base px-4"
          value="temas"
        >
          <AccordionTrigger className="font-semibold text-base">
            Temas
          </AccordionTrigger>
          <AccordionContent>
            <TemasList temas={temas} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Desktop: stack linear de SectionCards (Card compound do RDS via
          cópia local; scroll-mt-28 embutido). Ordem das âncoras casa com
          o SectionNav; no Accordion mobile a ordem é narrativa. */}
      <div className="mt-6 hidden space-y-5 sm:block">
        <SectionCard id="temas" title="Temas">
          <TemasList temas={temas} />
        </SectionCard>

        <SectionCard
          id="autores"
          subtitle="Parlamentares vinculados levam ao seu perfil 360°. Comissões, mesas e demais autores não-individuais aparecem só como nome."
          title="Autores"
        >
          <div className="space-y-4">
            {apoioPartido.length > 0 ? (
              <ApoioPartidoChart data={apoioPartido} />
            ) : null}
            <AutoresList autores={autores} />
          </div>
        </SectionCard>

        <SectionCard
          id="votacoes"
          subtitle="Votações conhecidamente associadas a esta proposição. Para votações nominais detalhadas (voto por parlamentar), navegue até a página da votação correspondente."
          title="Votações vinculadas"
        >
          <div className="space-y-4">
            {votosConsolidados ? (
              <VotosConsolidadosChart data={votosConsolidados} />
            ) : null}
            <VotacoesVinculadas
              buildFiltroHref={buildVotacoesFiltroHref}
              casa={votacoesCasa}
              resultado={votacoesResultado}
              votacoes={votacoes}
            />
          </div>
        </SectionCard>

        <SectionCard
          id="tramitacao"
          subtitle="Histórico de movimentação da proposição, do evento mais recente para o mais antigo. Despachos completos disponíveis em cada evento quando agregam contexto."
          title="Tramitação"
        >
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
        </SectionCard>
      </div>

      <FooterCrossLinks
        autorPrincipalNome={autorPrincipal?.nome ?? null}
        mesmoAutor={mesmoAutor}
        mesmoTema={mesmoTema}
      />
    </div>
  )
}
