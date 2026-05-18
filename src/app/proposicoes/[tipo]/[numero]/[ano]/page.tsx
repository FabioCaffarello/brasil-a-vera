import { Clock, FileText, Tag, Users } from 'lucide-react'
import { notFound, permanentRedirect } from 'next/navigation'

import { AutoresList } from '@/components/proposicao/autores-list'
import { FooterCrossLinks } from '@/components/proposicao/footer-cross-links'
import { PerfilProposicaoHeader } from '@/components/proposicao/perfil-header'
import { TemasList } from '@/components/proposicao/temas-list'
import { TramitacaoTimeline } from '@/components/proposicao/tramitacao-timeline'
import { VotacoesVinculadas } from '@/components/proposicao/votacoes-vinculadas'
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
import { formatProposicaoRef } from '@/lib/format'
import { CursorTramitacaoV1 } from '@/lib/queries/cursor-schemas'
import {
  getAutoresByProposicao,
  getProposicaoByChave,
  getTemasByProposicao,
  getTramitacaoByProposicao,
  getVotacoesByProposicao,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
} from '@/lib/queries/proposicoes'
import {
  getProposicoesMesmoAutor,
  getProposicoesMesmoTema,
} from '@/lib/queries/proposicoes-relacionadas'
import { getProposicaoStats } from '@/lib/queries/proposicoes-stats'
import { buildKpiSlotsDetalhe } from '@/modules/proposicoes/domain/kpi-detalhe'

interface PageProps {
  params: Promise<{ tipo: string; numero: string; ano: string }>
  searchParams: Promise<{ tram_after?: string }>
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

// Constrói href preservando outros params (futuro: filtros mini do
// Sprint 8.3 PR2/PR3). Override com null strip o param do URL —
// usado no permanentRedirect 308 quando o cursor decodifica como
// inválido (ADR-026 §5).
function buildDetalheHref(
  tipo: string,
  numero: number,
  ano: number,
  params: Awaited<PageProps['searchParams']>,
  override: { tram_after?: string | null },
  anchor = '',
): string {
  const merged = { ...params, ...override }
  const search = new URLSearchParams()
  for (const key of ['tram_after'] as const) {
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

  // Wave 8 Sprint 8.3 PR1 — cursor pagination da tramitação (ADR-026 §5).
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

  const [temas, autores, votacoes, tramitacaoPage, stats] = await Promise.all([
    getTemasByProposicao(proposicao.id),
    getAutoresByProposicao(proposicao.id),
    getVotacoesByProposicao(proposicao.id),
    getTramitacaoByProposicao(proposicao.id, { cursor: cursorTramitacao }),
    getProposicaoStats(proposicao.id),
  ])

  // Wave 8 Sprint 8.2 PR1 — 4 slots narrativos do KpiStrip do detalhe.
  // Pura: rodada 2 §Decisões resolvidas #1 + §Contratos de fallback.
  const kpiSlots = buildKpiSlotsDetalhe({
    tipo: proposicao.tipo,
    situacao: proposicao.situacao,
    stats,
  })

  // Wave 8 Sprint 8.3 PR1 — link "Mostrar mais" da tramitação.
  // Restantes só calculável na 1ª página (sem rastreio de page-N entre
  // requests). nEventosTramitacao vem do agregado (total real).
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
    !cursorTramitacao && stats?.nEventosTramitacao
      ? Math.max(0, stats.nEventosTramitacao - tramitacaoPage.rows.length)
      : null

  // Wave 8 Sprint 8.2 PR5 — fase 2 do fetch para footer cross-links.
  // Depende dos resultados da fase 1 (autor principal vem da lista
  // de autores; tema canônico vem do stats). 1 round-trip extra ao
  // DB mas cacheado 1h via TTL.proposicoesRelacionadas.
  //
  // "Autor principal" = primeiro AUTOR (tipoAutoria=AUTOR) com
  // parlamentar_id NOT NULL. Lista `autores` já ordena AUTOR antes
  // de COAUTOR (asc(tipoAutoria) = D antes de O), depois asc(nome).
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

      <KpiStrip
        className="mt-6"
        items={kpiSlots.map((slot) => ({
          label: slot.label,
          value: slot.value,
          hint: slot.hint,
          tone: slot.tone,
        }))}
      />

      {/* SectionNav só desktop — no mobile o Accordion abaixo já é a nav.
          Wave 8 Sprint 8.2 PR4 (espelha padrão Wave 7 Sprint 7.2 PR4). */}
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

      {/* Mobile: Accordion colapsável (Wave 8 Sprint 8.2 PR4).
          defaultValue=['tramitacao', 'autores'] cravado na rodada 2
          (§Decisões resolvidas #3 — hierarquia das perguntas cívicas em
          mobile share: "está vivo?" → tramitação; "quem propôs?" → autores). */}
      <Accordion
        className="mt-6 space-y-3 sm:hidden"
        defaultValue={['tramitacao', 'autores']}
        type="multiple"
      >
        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="tramitacao"
        >
          <AccordionTrigger className="font-semibold text-base">
            Tramitação
          </AccordionTrigger>
          <AccordionContent>
            <TramitacaoTimeline
              eventos={tramitacaoPage.rows}
              mostrarMaisHref={tramitacaoMostrarMaisHref}
              restantes={tramitacaoRestantes}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="autores"
        >
          <AccordionTrigger className="font-semibold text-base">
            Autores
          </AccordionTrigger>
          <AccordionContent>
            <AutoresList autores={autores} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="votacoes"
        >
          <AccordionTrigger className="font-semibold text-base">
            Votações vinculadas
          </AccordionTrigger>
          <AccordionContent>
            <VotacoesVinculadas votacoes={votacoes} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
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

      {/* Desktop: stack linear de SectionCards (mantém scroll-spy anchors).
          Ordem mantida do Wave 6 (temas → autores → votações → tramitação)
          — aqui as âncoras do SectionNav precisam casar. No Accordion mobile
          a ordem é narrativa (tramitação → autores → votações → temas)
          conforme decisão #3 da rodada 2. */}
      <div className="mt-6 hidden space-y-5 sm:block">
        <SectionCard className="scroll-mt-28" id="temas" title="Temas">
          <TemasList temas={temas} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="autores"
          subtitle="Parlamentares vinculados levam ao seu perfil 360°. Comissões, mesas e demais autores não-individuais aparecem só como nome."
          title="Autores"
        >
          <AutoresList autores={autores} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="votacoes"
          subtitle="Votações conhecidamente associadas a esta proposição. Para votações nominais detalhadas (voto por parlamentar), navegue até a página da votação correspondente."
          title="Votações vinculadas"
        >
          <VotacoesVinculadas votacoes={votacoes} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="tramitacao"
          subtitle="Histórico de movimentação da proposição, do evento mais recente para o mais antigo. Despachos completos disponíveis em cada evento quando agregam contexto."
          title="Tramitação"
        >
          <TramitacaoTimeline
            eventos={tramitacaoPage.rows}
            mostrarMaisHref={tramitacaoMostrarMaisHref}
            restantes={tramitacaoRestantes}
          />
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
