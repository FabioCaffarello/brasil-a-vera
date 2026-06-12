// Rota piloto-4: cópia-rds de /votacoes/[id] sob /rds/ — terceiro e
// último perfil de detalhe do trio, repetindo o padrão das pilotos 2/3.
// Convive em paralelo com a rota original (strangler fig); promoção é
// decisão futura.
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// por composição nested — NÃO importar aqui.
//
// Substituições estruturais (mesmas das pilotos 2/3; ver §3.9 do
// route-readiness.md para os workarounds com relógio):
// - KpiStrip → StatGroup + Stat do /server (tone map estabelecido)
// - SectionCard → cópia local sobre Card compound (reuso verbatim)
// - SectionNav → cópia local com IntersectionObserver (RDS #203)
// - Accordion mobile: primitiva Radix LOCAL (RDS #202)
// - Charts recharts (dynamic ssr:false) importados dos originais —
//   client islands compartilhados, sem tradução neste PR.
//
// CHECKPOINT(piloto-4) — data-viz custom (regra 2 do contrato de
// migração), aguardando decisão do owner antes de qualquer tradução:
// - VotacaoHemicicloChart (SVG inline server-rendered, cores via
//   var(--success)/var(--warning)/etc.)
// - MargemDecisaoBar (barra CSS-only bg-success/bg-destructive)
// Ambos importados dos ORIGINAIS, sem cópia e sem tradução — estado
// pendente menos intrusivo (paridade visual garantida; cópia+tradução
// só após aprovação).
//
// Tradução de classnames segue EXCLUSIVAMENTE
// `docs/migration/token-map.md` (+ extensões pilotos 2/3).

import { Stat, StatGroup } from '@fabio.caffarello/react-design-system/server'
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

import { ExportCsvLink } from '@/components/export-csv-link'
import { DisciplinaPartidariaChart } from '@/components/votacao/charts/disciplina-chart-client'
import { VotacaoHemicicloChart } from '@/components/votacao/charts/hemiciclo'
import { VotacaoPorPartidoChart } from '@/components/votacao/charts/por-partido-chart-client'
import { VotacaoVotosConsolidadosChart } from '@/components/votacao/charts/votos-consolidados-chart-client'
import { MargemDecisaoBar } from '@/components/votacao/margem-decisao'
import { canExport } from '@/lib/auth-guards'
import {
  getDisciplinaPartidariaPorVotacao,
  getProposicaoVinculada,
  getRebeldesByVotacao,
  getVotacaoById,
  getVotacoesRelacionadas,
  getVotosByVotacao,
  getVotosResumoPorPartido,
} from '@/lib/queries/votacoes'
import { calcularDisciplinaMedia } from '@/modules/votacoes/domain/disciplina'
import { VotacoesRelacionadasFooter } from './_components/footer-relacionadas'
import { PerfilVotacaoHeader } from './_components/perfil-header'
import { ProposicaoVinculada } from './_components/proposicao-vinculada'
import { Accordion } from './_components/rds-accordion'
import { RebeldesList } from './_components/rebeldes-list'
import { SectionCard } from './_components/section-card'
import { SectionNav } from './_components/section-nav'
import { VotosIndividuais } from './_components/votos-individuais'
import { VotosPorPartido } from './_components/votos-por-partido'
import { VotosResumo } from './_components/votos-resumo'

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
  if (!v) return { title: 'Votação (rds-pilot) — Brasil à Vera' }
  const title = `Votação (rds-pilot) — ${v.descricao.slice(0, 80)}`
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
    rebeldes,
    relacionadas,
    canExportData,
  ] = await Promise.all([
    getProposicaoVinculada(v.proposicaoId),
    getVotosByVotacao(v.id),
    getVotosResumoPorPartido(v.id),
    getDisciplinaPartidariaPorVotacao(v.id),
    getRebeldesByVotacao(v.id),
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-5">
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
                  id: 'rebeldes',
                  label: 'Rebeldes',
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
          macros abertos). Itens de disciplina/rebeldes seguem
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
                  content: <DisciplinaPartidariaChart data={disciplinas} />,
                },
                {
                  id: 'rebeldes',
                  title: 'Quem rebelou-se',
                  className: 'rounded-lg border-line-default bg-surface-base',
                  triggerClassName: 'font-semibold text-base',
                  content: (
                    <RebeldesList
                      partidosComOrientacao={disciplinas.length}
                      rebeldes={rebeldes}
                    />
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
              <div className="space-y-3">
                {canExportData && (
                  <div className="flex justify-end">
                    <ExportCsvLink
                      href={`/api/export/votacoes/${v.id}/votos`}
                      label="Exportar todos os votos (CSV)"
                    />
                  </div>
                )}
                <VotosIndividuais votacaoId={v.id} votos={votos} />
              </div>
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

        {/* Disciplina partidária + Rebeldes — D5: condicionais, só
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
            </SectionCard>

            <SectionCard
              id="rebeldes"
              subtitle="Parlamentares que votaram contra a orientação do próprio partido nesta votação. Voto ativo (Sim/Não/Obstrução) divergente da orientação efetiva."
              title="Quem rebelou-se"
            >
              <RebeldesList
                partidosComOrientacao={disciplinas.length}
                rebeldes={rebeldes}
              />
            </SectionCard>
          </>
        ) : null}

        <SectionCard
          id="individuais"
          subtitle="Clique no nome para ver o perfil 360° do parlamentar. Use os filtros para ver só uma direção."
          title="Votos individuais"
        >
          {canExportData && (
            <div className="mb-3 flex justify-end">
              <ExportCsvLink
                href={`/api/export/votacoes/${v.id}/votos`}
                label="Exportar todos os votos (CSV)"
              />
            </div>
          )}
          <VotosIndividuais votacaoId={v.id} votos={votos} />
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
