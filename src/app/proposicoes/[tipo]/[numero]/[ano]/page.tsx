import { notFound } from 'next/navigation'

import { AutoresList } from '@/components/proposicao/autores-list'
import { PerfilProposicaoHeader } from '@/components/proposicao/perfil-header'
import { TemasList } from '@/components/proposicao/temas-list'
import { TramitacaoTimeline } from '@/components/proposicao/tramitacao-timeline'
import { VotacoesVinculadas } from '@/components/proposicao/votacoes-vinculadas'
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
  if (!parsed) return { title: 'Proposição — Brasil a Vera' }
  const p = await getProposicaoByChave(parsed.tipo, parsed.numero, parsed.ano)
  if (!p) return { title: 'Proposição — Brasil a Vera' }
  const ref = formatProposicaoRef(p.tipo, p.numero, p.ano)
  const title = `${ref} — Brasil a Vera`
  const description = p.ementa.slice(0, 200)
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header className="mb-3">
        <h2 className="font-medium text-foreground-muted text-sm uppercase tracking-wide">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-foreground-muted text-xs">{hint}</p>}
      </header>
      {children}
    </section>
  )
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

  const [temas, autores, votacoes, tramitacao] = await Promise.all([
    getTemasByProposicao(proposicao.id),
    getAutoresByProposicao(proposicao.id),
    getVotacoesByProposicao(proposicao.id),
    getTramitacaoByProposicao(proposicao.id),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
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
      />

      <Section title="Temas">
        <TemasList temas={temas} />
      </Section>

      <Section
        title="Autores"
        hint="Parlamentares vinculados levam ao seu perfil 360°. Comissões, mesas e demais autores não-individuais aparecem só como nome."
      >
        <AutoresList autores={autores} />
      </Section>

      <Section
        title="Votações vinculadas"
        hint="Votações conhecidamente associadas a esta proposição. Para votações nominais detalhadas (voto por parlamentar), navegue até a página da votação correspondente — virá em PR seguinte."
      >
        <VotacoesVinculadas votacoes={votacoes} />
      </Section>

      <Section
        title="Tramitação"
        hint="Histórico de movimentação da proposição, do evento mais recente para o mais antigo. Despachos completos disponíveis em cada evento quando agregam contexto."
      >
        <TramitacaoTimeline eventos={tramitacao} />
      </Section>
    </div>
  )
}
