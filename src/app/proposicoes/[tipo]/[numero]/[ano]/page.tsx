import { Clock, FileText, Tag, Users } from 'lucide-react'
import { notFound } from 'next/navigation'

import { AutoresList } from '@/components/proposicao/autores-list'
import { PerfilProposicaoHeader } from '@/components/proposicao/perfil-header'
import { TemasList } from '@/components/proposicao/temas-list'
import { TramitacaoTimeline } from '@/components/proposicao/tramitacao-timeline'
import { VotacoesVinculadas } from '@/components/proposicao/votacoes-vinculadas'
import { KpiStrip } from '@/design-system/compositions/kpi-strip'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import { formatProposicaoRef } from '@/lib/format'
import {
  getAutoresByProposicao,
  getProposicaoByChave,
  getTemasByProposicao,
  getTramitacaoByProposicao,
  getVotacoesByProposicao,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
} from '@/lib/queries/proposicoes'
import { getProposicaoStats } from '@/lib/queries/proposicoes-stats'
import { buildKpiSlotsDetalhe } from '@/modules/proposicoes/domain/kpi-detalhe'

interface PageProps {
  params: Promise<{ tipo: string; numero: string; ano: string }>
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

export default async function ProposicaoDetalhePage({ params }: PageProps) {
  const raw = await params
  const parsed = parseParams(raw)
  if (!parsed) notFound()

  const proposicao = await getProposicaoByChave(
    parsed.tipo,
    parsed.numero,
    parsed.ano,
  )
  if (!proposicao) notFound()

  const [temas, autores, votacoes, tramitacao, stats] = await Promise.all([
    getTemasByProposicao(proposicao.id),
    getAutoresByProposicao(proposicao.id),
    getVotacoesByProposicao(proposicao.id),
    getTramitacaoByProposicao(proposicao.id),
    getProposicaoStats(proposicao.id),
  ])

  // Wave 8 Sprint 8.2 PR1 — 4 slots narrativos do KpiStrip do detalhe.
  // Pura: rodada 2 §Decisões resolvidas #1 + §Contratos de fallback.
  const kpiSlots = buildKpiSlotsDetalhe({
    tipo: proposicao.tipo,
    situacao: proposicao.situacao,
    stats,
  })

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

      <SectionNav
        className="mt-6"
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

      <div className="mt-6 space-y-5">
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
          <TramitacaoTimeline eventos={tramitacao} />
        </SectionCard>
      </div>
    </div>
  )
}
