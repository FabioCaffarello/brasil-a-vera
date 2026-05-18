import {
  Check,
  CircleSlash,
  FileText,
  Minus,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { notFound } from 'next/navigation'

import { ExportCsvLink } from '@/components/export-csv-link'
import { PerfilVotacaoHeader } from '@/components/votacao/perfil-header'
import { ProposicaoVinculada } from '@/components/votacao/proposicao-vinculada'
import { VotosIndividuais } from '@/components/votacao/votos-individuais'
import { VotosPorPartido } from '@/components/votacao/votos-por-partido'
import { VotosResumo } from '@/components/votacao/votos-resumo'
import { KpiStrip } from '@/design-system/compositions/kpi-strip'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import {
  getProposicaoVinculada,
  getTopVotacoesParaSSG,
  getVotacaoById,
  getVotosByVotacao,
  getVotosResumoPorPartido,
} from '@/lib/queries/votacoes'

interface PageProps {
  params: Promise<{ id: string }>
}

// Wave 9 Sprint 9.2 PR1 (D7) — top-200 votações mais recentes geradas
// estaticamente no build. Cobre >95% do tráfego (votações novas
// concentram interesse). Restante cai em ISR fallback nativo do Next 16.
// Filtro ?voto=X migrou para client-side em VotosIndividuais → página
// não opta-out mais de SSG.
export async function generateStaticParams() {
  return getTopVotacoesParaSSG(200)
}

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

  const [proposicao, votos, resumoPorPartido] = await Promise.all([
    getProposicaoVinculada(v.proposicaoId),
    getVotosByVotacao(v.id),
    getVotosResumoPorPartido(v.id),
  ])

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
              tone: 'success',
            },
            {
              icon: <X className="h-4 w-4" />,
              label: 'Não',
              value: v.votosNao,
              tone: 'destructive',
            },
            {
              icon: <Minus className="h-4 w-4" />,
              label: 'Abstenção',
              value: v.abstencoes,
              tone: 'warning',
            },
            {
              icon: <UserX className="h-4 w-4" />,
              label: 'Ausente',
              value: v.ausentes,
              tone: 'muted',
            },
          ]}
        />
      </div>

      <SectionNav
        className="mt-6"
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

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SectionCard className="scroll-mt-28" id="resumo" title="Resumo">
            <VotosResumo
              totais={{
                sim: v.votosSim,
                nao: v.votosNao,
                abstencoes: v.abstencoes,
                ausentes: v.ausentes,
              }}
            />
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
          <VotosPorPartido porPartido={resumoPorPartido} />
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
