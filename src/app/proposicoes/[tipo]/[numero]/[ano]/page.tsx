import { notFound } from 'next/navigation'

import { AutoresList } from '@/components/proposicao/autores-list'
import { PerfilProposicaoHeader } from '@/components/proposicao/perfil-header'
import { TemasList } from '@/components/proposicao/temas-list'
import { VotacoesVinculadas } from '@/components/proposicao/votacoes-vinculadas'
import { formatProposicaoRef } from '@/lib/format'
import {
  getAutoresByProposicao,
  getProposicaoByChave,
  getTemasByProposicao,
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
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <header className="mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h2>
        {hint && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {hint}
          </p>
        )}
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

  const [temas, autores, votacoes] = await Promise.all([
    getTemasByProposicao(proposicao.id),
    getAutoresByProposicao(proposicao.id),
    getVotacoesByProposicao(proposicao.id),
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
    </div>
  )
}
