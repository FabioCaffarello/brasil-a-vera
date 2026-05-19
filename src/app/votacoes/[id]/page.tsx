import { BarChart3, Check, CircleSlash, FileText, Users, X } from 'lucide-react'
import { notFound } from 'next/navigation'

import { ExportCsvLink } from '@/components/export-csv-link'
import { VotacaoHemicicloChart } from '@/components/votacao/charts/hemiciclo'
import { VotacaoPorPartidoChart } from '@/components/votacao/charts/por-partido-chart-client'
import { VotacaoVotosConsolidadosChart } from '@/components/votacao/charts/votos-consolidados-chart-client'
import { MargemDecisaoBar } from '@/components/votacao/margem-decisao'
import { PerfilVotacaoHeader } from '@/components/votacao/perfil-header'
import { ProposicaoVinculada } from '@/components/votacao/proposicao-vinculada'
import { VotosIndividuais } from '@/components/votacao/votos-individuais'
import { VotosPorPartido } from '@/components/votacao/votos-por-partido'
import { VotosResumo } from '@/components/votacao/votos-resumo'
import { KpiStrip } from '@/design-system/compositions/kpi-strip'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/design-system/primitives/accordion'
import {
  getDisciplinaPartidariaPorVotacao,
  getProposicaoVinculada,
  getVotacaoById,
  getVotosByVotacao,
  getVotosResumoPorPartido,
} from '@/lib/queries/votacoes'
import { calcularDisciplinaMedia } from '@/modules/votacoes/domain/disciplina'

interface PageProps {
  params: Promise<{ id: string }>
}

// Rota dinâmica (server-rendered on demand) + cache de edge nas queries
// via cached() wrappers (Sprint 9.0 PR 9.0.3). Paridade com
// /parlamentares/[id] e /proposicoes/[tipo]/[numero]/[ano] que também
// são dinâmicas em Workers.
//
// Por que NÃO usamos SSG via generateStaticParams (lição empírica do
// fix #293, revertendo PR 9.2.1): OpenNext em Workers exige binding R2
// como incremental cache para servir páginas SSG/ISR (ver wrangler.jsonc
// comentário + Issue #58). Sem R2, qualquer rota com generateStaticParams
// quebra em runtime com 500. Quando Issue #58 entregar R2 cache, podemos
// reintroduzir SSG aqui (e em parlamentares/proposicoes também).
//
// O cliente filter de ?voto=X em VotosIndividuais (parte boa do PR 9.2.1)
// é PRESERVADO — não causa nenhum problema de SSG porque a página é
// dinâmica anyway. Filter in-memory continua reativo via useSearchParams.

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

  const [proposicao, votos, resumoPorPartido, disciplinas] = await Promise.all([
    getProposicaoVinculada(v.proposicaoId),
    getVotosByVotacao(v.id),
    getVotosResumoPorPartido(v.id),
    getDisciplinaPartidariaPorVotacao(v.id),
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

        <KpiStrip
          items={[
            {
              icon: <Check className="h-4 w-4" />,
              label: 'Sim',
              value: v.votosSim,
              hint:
                pctSim !== null
                  ? `${pctSim}% dos nominais`
                  : 'votação simbólica',
              tone: 'success',
            },
            {
              icon: <X className="h-4 w-4" />,
              label: 'Não',
              value: v.votosNao,
              hint:
                pctNao !== null
                  ? `${pctNao}% dos nominais`
                  : 'votação simbólica',
              tone: 'destructive',
            },
            {
              icon: <BarChart3 className="h-4 w-4" />,
              label: 'Margem',
              value: margemValue,
              hint: margemHint,
            },
            {
              icon: <Users className="h-4 w-4" />,
              label: 'Disciplina',
              value: disciplinaValue,
              hint: disciplinaHint,
            },
          ]}
        />
      </div>

      {/* SectionNav só desktop — no mobile o Accordion abaixo já é a nav.
          Wave 9 Sprint 9.2 PR5 (espelha padrão Wave 7 / Wave 8). */}
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
          {
            id: 'individuais',
            label: 'Individuais',
            icon: <Users className="h-4 w-4" />,
          },
        ]}
        stickyTop="3.5rem"
      />

      {/* Mobile: Accordion colapsável. defaultValue=['resumo','partido']
          abre os dois macros (visão consolidada + bancadas) — mantém peso
          cognitivo similar ao Accordion Wave 8 (2 seções abertas). Ordem
          narrativa mobile: resumo → partido → individuais → proposição. */}
      <Accordion
        className="mt-6 space-y-3 sm:hidden"
        defaultValue={['resumo', 'partido']}
        type="multiple"
      >
        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="resumo"
        >
          <AccordionTrigger className="font-semibold text-base">
            Resumo
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="partido"
        >
          <AccordionTrigger className="font-semibold text-base">
            Por partido
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <VotacaoPorPartidoChart data={resumoPorPartido} />
            <details className="text-sm">
              <summary className="cursor-pointer text-foreground-muted hover:text-foreground">
                Ver tabela numérica
              </summary>
              <div className="mt-3">
                <VotosPorPartido porPartido={resumoPorPartido} />
              </div>
            </details>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="individuais"
        >
          <AccordionTrigger className="font-semibold text-base">
            Individuais
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="flex justify-end">
              <ExportCsvLink
                href={`/api/export/votacoes/${v.id}/votos`}
                label="Exportar todos os votos (CSV)"
              />
            </div>
            <VotosIndividuais votacaoId={v.id} votos={votos} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className="rounded-lg border-border bg-surface px-4"
          value="proposicao"
        >
          <AccordionTrigger className="font-semibold text-base">
            Proposição vinculada
          </AccordionTrigger>
          <AccordionContent>
            {proposicao ? (
              <ProposicaoVinculada proposicao={proposicao} />
            ) : (
              <p className="text-foreground-muted text-sm">
                Nenhuma proposição foi vinculada a esta votação na base atual.
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Desktop: stack linear de SectionCards (mantém scroll-spy anchors
          do SectionNav). Ordem preserva grid 2-col em resumo+proposição
          no md+, depois Por partido e Individuais em largura total. */}
      <div className="mt-6 hidden space-y-5 sm:block">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SectionCard className="scroll-mt-28" id="resumo" title="Resumo">
            <div className="space-y-4">
              <MargemDecisaoBar
                aprovada={v.aprovada}
                votosNao={v.votosNao}
                votosSim={v.votosSim}
              />
              {/* D3 — Hemiciclo SVG em desktop (≥md), Donut em viewport
                  estreito. SVG puro server-rendered, zero JS, ~120 linhas. */}
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

          <SectionCard
            className="scroll-mt-28"
            id="proposicao"
            title="Proposição vinculada"
          >
            {proposicao ? (
              <ProposicaoVinculada proposicao={proposicao} />
            ) : (
              <p className="text-foreground-muted text-sm">
                Nenhuma proposição foi vinculada a esta votação na base atual. O
                backfill liga apenas votações cuja proposição já foi ingerida (o
                conjunto de proposições é restrito ao período coberto até
                agora).
              </p>
            )}
          </SectionCard>
        </div>

        <SectionCard
          className="scroll-mt-28"
          id="partido"
          subtitle="Como cada bancada se posicionou (soma dos votos individuais)."
          title="Por partido"
        >
          <div className="space-y-3">
            <VotacaoPorPartidoChart data={resumoPorPartido} />
            <details className="text-sm">
              <summary className="cursor-pointer text-foreground-muted hover:text-foreground">
                Ver tabela numérica
              </summary>
              <div className="mt-3">
                <VotosPorPartido porPartido={resumoPorPartido} />
              </div>
            </details>
          </div>
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="individuais"
          subtitle="Clique no nome para ver o perfil 360° do parlamentar. Use os filtros para ver só uma direção."
          title="Votos individuais"
        >
          <div className="mb-3 flex justify-end">
            <ExportCsvLink
              href={`/api/export/votacoes/${v.id}/votos`}
              label="Exportar todos os votos (CSV)"
            />
          </div>
          <VotosIndividuais votacaoId={v.id} votos={votos} />
        </SectionCard>
      </div>
    </div>
  )
}
