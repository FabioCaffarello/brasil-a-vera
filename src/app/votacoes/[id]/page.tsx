// Perfil de votação — promovido ao RDS (migração ADR-033). Consome o design
// system @fabio.caffarello/react-design-system — tokens traduzidos pela tabela
// canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// por composição nested — NÃO importar aqui.
//
// - Stat/StatGroup (KPIs) + SectionCard (Card compound) do /server; SectionNav
//   (useScrollSpy) de @/design-system/compositions; Accordion mobile via
//   @/design-system/primitives/rds-accordion (/granular).
// - Data-viz (VotacaoHemicicloChart SVG, MargemDecisaoBar CSS, 3 charts recharts)
//   sobem como resíduo BaV (ADR-034 §5 — sem paleta de chart upstream).

import {
  Breadcrumb,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import {
  BarChart3,
  Check,
  CircleSlash,
  FileText,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import { notFound } from 'next/navigation'

import { DisciplinaPartidariaChart } from '@/components/votacao/charts/disciplina-chart-client'
import { VotacaoHemicicloChart } from '@/components/votacao/charts/hemiciclo'
import { VotacaoPorPartidoChart } from '@/components/votacao/charts/por-partido-chart-client'
import { VotacaoVotosConsolidadosChart } from '@/components/votacao/charts/votos-consolidados-chart-client'
import { DivergenciasList } from '@/components/votacao/divergencias-list'
import { FederacaoExclusaoNota } from '@/components/votacao/federacao-exclusao-nota'
import { VotacoesRelacionadasFooter } from '@/components/votacao/footer-relacionadas'
import { MargemDecisaoBar } from '@/components/votacao/margem-decisao'
import { PerfilVotacaoHeader } from '@/components/votacao/perfil-header'
import { ProposicaoVinculada } from '@/components/votacao/proposicao-vinculada'
import { VotosDrawer } from '@/components/votacao/votos-drawer'
import { VotosPorPartido } from '@/components/votacao/votos-por-partido'
import { VotosResumo } from '@/components/votacao/votos-resumo'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import { Accordion } from '@/design-system/primitives/rds-accordion'
import { canExport } from '@/lib/auth-guards'
import { formatDataBR } from '@/lib/format'
import {
  getDisciplinaPartidariaPorVotacao,
  getDivergenciasByVotacao,
  getProposicaoVinculada,
  getVotacaoById,
  getVotacoesRelacionadas,
  getVotosByVotacao,
  getVotosResumoPorPartido,
} from '@/lib/queries/votacoes'
import {
  calcularDisciplinaMedia,
  siglasFederadasExcluidas,
} from '@/modules/votacoes/domain/disciplina'

interface PageProps {
  params: Promise<{ id: string }>
}

// Rota dinâmica (server-rendered on demand) + cache de edge nas queries
// via cached() wrappers — paridade com a rota original (ver comentário
// em src/app/votacoes/[id]/page.tsx sobre por que NÃO usar SSG via
// generateStaticParams em Workers sem R2).

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const v = await getVotacaoById(id)
  if (!v) return { title: 'Votação — Brasil à Vera' }
  const title = `Votação — ${v.descricao.slice(0, 80)}`
  const description = v.descricao.slice(0, 200)
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

export default async function VotacaoPage({ params }: PageProps) {
  const { id } = await params

  const v = await getVotacaoById(id)
  if (!v) notFound()

  const [
    proposicao,
    votos,
    resumoPorPartido,
    disciplinas,
    divergencias,
    relacionadas,
    canExportData,
  ] = await Promise.all([
    getProposicaoVinculada(v.proposicaoId),
    getVotosByVotacao(v.id),
    getVotosResumoPorPartido(v.id),
    getDisciplinaPartidariaPorVotacao(v.id),
    getDivergenciasByVotacao(v.id),
    getVotacoesRelacionadas(v.id, 4),
    canExport(),
  ])

  // KpiStrip híbrido (D1 do WAVE-9-VOTACOES-PLAN.md) — SIM/NÃO como
  // âncoras cognitivas, Margem + Disciplina como narrativa única de
  // votações.
  const totalNominal = v.votosSim + v.votosNao + v.abstencoes
  const pctSim =
    totalNominal > 0 ? Math.round((v.votosSim / totalNominal) * 100) : null
  const pctNao =
    totalNominal > 0 ? Math.round((v.votosNao / totalNominal) * 100) : null

  // Margem como delta absoluto. Sinal "+" sempre — o hint conta de quem
  // foi a vantagem (a favor / contra). Empate e simbólica explicitados.
  const margemAbs = Math.abs(v.votosSim - v.votosNao)
  const margemValue = totalNominal === 0 ? '—' : `+${margemAbs}`
  const margemHint =
    totalNominal === 0
      ? 'votação simbólica'
      : margemAbs === 0
        ? 'empate'
        : v.aprovada
          ? 'votos a favor'
          : 'votos contra'

  // Disciplina média entre partidos com orientação efetiva (LIBERADO
  // excluído pela query). Null = nenhuma orientação registrada — slot
  // mostra "—" honesto.
  const disciplinaMedia = calcularDisciplinaMedia(disciplinas)
  const disciplinaValue =
    disciplinaMedia === null ? '—' : `${Math.round(disciplinaMedia)}%`
  const disciplinaHint =
    disciplinaMedia === null
      ? 'sem orientações registradas'
      : `média de ${disciplinas.length} ${disciplinas.length === 1 ? 'partido' : 'partidos'}`

  // Sinal de exclusão de bancadas federadas (#482/#484, ADR-041 §5). Derivado
  // sem nova query a partir de `resumoPorPartido` (já carregado) + `disciplinas`
  // (barras visíveis). Lógica pura testada em `domain/disciplina.ts`.
  const federadasExcluidas = siglasFederadasExcluidas(
    resumoPorPartido,
    disciplinas.map((d) => d.partido),
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-5">
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Votações', href: '/votacoes' },
            { label: formatDataBR(v.dataHora) },
          ]}
        />
        <PerfilVotacaoHeader
          votacao={{
            casa: v.casa,
            dataHora: v.dataHora,
            descricao: v.descricao,
            orgao: v.orgao,
            aprovada: v.aprovada,
            votosSim: v.votosSim,
            votosNao: v.votosNao,
            sourceUrl: v.sourceUrl,
            trustLevel: v.trustLevel,
          }}
        />

        {/* StatGroup do RDS substitui o KpiStrip local (padrão piloto-2:
            borda externa via className; StatGroup só traz dividers).
            Tone map estabelecido: default/muted→neutral,
            destructive→error. */}
        <StatGroup
          className="overflow-hidden rounded-lg border border-line-default"
          cols={4}
          layout="grid"
        >
          <Stat
            hint={
              pctSim !== null ? `${pctSim}% dos nominais` : 'votação simbólica'
            }
            icon={<Check className="h-4 w-4" />}
            label="Sim"
            tone="success"
            value={v.votosSim}
          />
          <Stat
            hint={
              pctNao !== null ? `${pctNao}% dos nominais` : 'votação simbólica'
            }
            icon={<X className="h-4 w-4" />}
            label="Não"
            tone="error"
            value={v.votosNao}
          />
          <Stat
            hint={margemHint}
            icon={<BarChart3 className="h-4 w-4" />}
            label="Margem"
            tone="neutral"
            value={margemValue}
          />
          <Stat
            hint={disciplinaHint}
            icon={<Users className="h-4 w-4" />}
            label="Disciplina"
            tone="neutral"
            value={disciplinaValue}
          />
        </StatGroup>
      </div>

      {/* SectionNav só desktop — no mobile o Accordion abaixo já é a nav.
          Item "Disciplina" é condicional (D5 — só renderiza com
          orientações). */}
      <SectionNav
        className="mt-6 hidden sm:block"
        items={[
          {
            id: 'resumo',
            label: 'Resumo',
            icon: <CircleSlash className="h-4 w-4" />,
          },
          {
            id: 'proposicao',
            label: 'Proposição',
            icon: <FileText className="h-4 w-4" />,
          },
          {
            id: 'partido',
            label: 'Por partido',
            icon: <Users className="h-4 w-4" />,
          },
          ...(disciplinas.length > 0
            ? [
                {
                  id: 'disciplina',
                  label: 'Disciplina',
                  icon: <BarChart3 className="h-4 w-4" />,
                },
                {
                  id: 'divergencias',
                  label: 'Divergências',
                  icon: <UserMinus className="h-4 w-4" />,
                },
              ]
            : []),
          {
            id: 'individuais',
            label: 'Individuais',
            icon: <Users className="h-4 w-4" />,
          },
        ]}
        stickyTop="3.5rem"
      />

      {/* Mobile: Accordion do RDS via wrapper client de ./_components/
          rds-accordion (entry /granular da 3.9.0; ver medição no PR da
          varredura). defaultOpen=['resumo','partido'] preservado (2
          macros abertos). Itens de disciplina/divergências seguem
          condicionais (D5) via spread. */}
      <Accordion
        className="mt-6 space-y-3 sm:hidden"
        defaultOpen={['resumo', 'partido']}
        type="multiple"
        items={[
          {
            id: 'resumo',
            title: 'Resumo',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <div className="space-y-4">
                <MargemDecisaoBar
                  aprovada={v.aprovada}
                  votosNao={v.votosNao}
                  votosSim={v.votosSim}
                />
                <VotacaoVotosConsolidadosChart
                  data={{
                    sim: v.votosSim,
                    nao: v.votosNao,
                    abstencao: v.abstencoes,
                    ausentes: v.ausentes ?? 0,
                  }}
                />
                <VotosResumo
                  totais={{
                    sim: v.votosSim,
                    nao: v.votosNao,
                    abstencoes: v.abstencoes,
                    ausentes: v.ausentes,
                  }}
                />
              </div>
            ),
          },
          {
            id: 'partido',
            title: 'Por partido',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <div className="space-y-3">
                <VotacaoPorPartidoChart data={resumoPorPartido} />
                <details className="text-sm">
                  <summary className="cursor-pointer text-fg-tertiary hover:text-fg-primary">
                    Ver tabela numérica
                  </summary>
                  <div className="mt-3">
                    <VotosPorPartido porPartido={resumoPorPartido} />
                  </div>
                </details>
              </div>
            ),
          },
          ...(disciplinas.length > 0
            ? [
                {
                  id: 'disciplina',
                  title: 'Disciplina partidária',
                  className: 'rounded-lg border-line-default bg-surface-base',
                  triggerClassName: 'font-semibold text-base',
                  content: (
                    <>
                      <DisciplinaPartidariaChart data={disciplinas} />
                      <FederacaoExclusaoNota siglas={federadasExcluidas} />
                    </>
                  ),
                },
                {
                  id: 'divergencias',
                  title: 'Quem votou diferente da orientação',
                  className: 'rounded-lg border-line-default bg-surface-base',
                  triggerClassName: 'font-semibold text-base',
                  content: (
                    <>
                      <DivergenciasList
                        divergencias={divergencias}
                        partidosComOrientacao={disciplinas.length}
                      />
                      <FederacaoExclusaoNota siglas={federadasExcluidas} />
                    </>
                  ),
                },
              ]
            : []),
          {
            id: 'individuais',
            title: 'Individuais',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: (
              <VotosDrawer
                canExport={canExportData}
                exportHref={`/api/export/votacoes/${v.id}/votos`}
                votos={votos}
              />
            ),
          },
          {
            id: 'proposicao',
            title: 'Proposição vinculada',
            className: 'rounded-lg border-line-default bg-surface-base',
            triggerClassName: 'font-semibold text-base',
            content: proposicao ? (
              <ProposicaoVinculada proposicao={proposicao} />
            ) : (
              <p className="text-fg-tertiary text-sm">
                Nenhuma proposição foi vinculada a esta votação na base atual.
              </p>
            ),
          },
        ]}
      />

      {/* Desktop: stack linear de SectionCards (Card compound do RDS via
          cópia local; scroll-mt-28 embutido). Ordem preserva grid 2-col
          em resumo+proposição no md+, depois Por partido e Individuais
          em largura total. */}
      <div className="mt-6 hidden space-y-5 sm:block">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SectionCard id="resumo" title="Resumo">
            <div className="space-y-4">
              <MargemDecisaoBar
                aprovada={v.aprovada}
                votosNao={v.votosNao}
                votosSim={v.votosSim}
              />
              {/* D3 — Hemiciclo SVG em desktop (≥md), Donut em viewport
                  estreito. SVG puro server-rendered, zero JS. */}
              <div className="hidden md:block">
                <VotacaoHemicicloChart votos={votos} />
              </div>
              <div className="md:hidden">
                <VotacaoVotosConsolidadosChart
                  data={{
                    sim: v.votosSim,
                    nao: v.votosNao,
                    abstencao: v.abstencoes,
                    ausentes: v.ausentes ?? 0,
                  }}
                />
              </div>
              <VotosResumo
                totais={{
                  sim: v.votosSim,
                  nao: v.votosNao,
                  abstencoes: v.abstencoes,
                  ausentes: v.ausentes,
                }}
              />
            </div>
          </SectionCard>

          <SectionCard id="proposicao" title="Proposição vinculada">
            {proposicao ? (
              <ProposicaoVinculada proposicao={proposicao} />
            ) : (
              <p className="text-fg-tertiary text-sm">
                Nenhuma proposição foi vinculada a esta votação na base atual. O
                backfill liga apenas votações cuja proposição já foi ingerida (o
                conjunto de proposições é restrito ao período coberto até
                agora).
              </p>
            )}
          </SectionCard>
        </div>

        <SectionCard
          id="partido"
          subtitle="Como cada bancada se posicionou (soma dos votos individuais)."
          title="Por partido"
        >
          <div className="space-y-3">
            <VotacaoPorPartidoChart data={resumoPorPartido} />
            <details className="text-sm">
              <summary className="cursor-pointer text-fg-tertiary hover:text-fg-primary">
                Ver tabela numérica
              </summary>
              <div className="mt-3">
                <VotosPorPartido porPartido={resumoPorPartido} />
              </div>
            </details>
          </div>
        </SectionCard>

        {/* Disciplina partidária + Divergências — D5: condicionais, só
            renderizam se há orientações de bancada registradas. Quando
            ausentes, ambas as seções somem (sem placeholders vazios). */}
        {disciplinas.length > 0 ? (
          <>
            <SectionCard
              id="disciplina"
              subtitle="% de parlamentares de cada bancada que seguiram a orientação do próprio partido. Partidos que liberaram a bancada não aparecem."
              title="Disciplina partidária"
            >
              <DisciplinaPartidariaChart data={disciplinas} />
              <FederacaoExclusaoNota siglas={federadasExcluidas} />
            </SectionCard>

            <SectionCard
              id="divergencias"
              subtitle="Parlamentares que votaram diferente da orientação do próprio partido nesta votação. Voto ativo (Sim/Não/Obstrução) divergente da orientação efetiva."
              title="Quem votou diferente da orientação"
            >
              <DivergenciasList
                divergencias={divergencias}
                partidosComOrientacao={disciplinas.length}
              />
              <FederacaoExclusaoNota siglas={federadasExcluidas} />
            </SectionCard>
          </>
        ) : null}

        <SectionCard
          id="individuais"
          subtitle="Abra a lista completa para navegar e filtrar os votos por direção (clique no nome para o perfil 360° do parlamentar) ou exporte tudo em CSV."
          title="Votos individuais"
        >
          <VotosDrawer
            canExport={canExportData}
            exportHref={`/api/export/votacoes/${v.id}/votos`}
            votos={votos}
          />
        </SectionCard>
      </div>

      {/* Footer cross-links — renderiza fora dos containers
          mobile/desktop porque é responsivo nativo (grid 1-col →
          md:2-col). Empty state interno suprime quando não há
          relacionadas. */}
      <VotacoesRelacionadasFooter votacoes={relacionadas} />
    </div>
  )
}
