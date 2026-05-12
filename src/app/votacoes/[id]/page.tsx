import { notFound } from 'next/navigation'

import { ExportCsvLink } from '@/components/export-csv-link'
import { PerfilVotacaoHeader } from '@/components/votacao/perfil-header'
import { ProposicaoVinculada } from '@/components/votacao/proposicao-vinculada'
import { VotosIndividuais } from '@/components/votacao/votos-individuais'
import { VotosPorPartido } from '@/components/votacao/votos-por-partido'
import { VotosResumo } from '@/components/votacao/votos-resumo'
import {
  getProposicaoVinculada,
  getVotacaoById,
  getVotosByVotacao,
  getVotosResumoPorPartido,
  TIPOS_VOTO,
  type TipoVoto,
} from '@/lib/queries/votacoes'

// SSG on-demand (Caminho C). Rota fica registrada como estática para o
// Next; primeiro request a cada id gera, cacheia (per-instance ISR + edge
// CDN via header s-maxage emitido com revalidate); requests subsequentes
// dentro do TTL servem do cache. Após revalidate, stale-while-revalidate.
//
// generateStaticParams retorna [] propositalmente para não tocar o banco
// no build (decisão registrada no Batch A: build CI usa placeholder
// DATABASE_URL por causa da regressão eager-validation do neon-http).
// Quando cold-start virar problema visível, migrar para Caminho B
// (workflow separado pre-gera IDs em JSON commitado, build consome
// sem precisar de DATABASE_URL real).
//
// Refs: ADR-018 (TTL.votacaoRecente = 1h), #42.
export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return []
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ voto?: string }>
}

function normalizeVoto(value: string | undefined): TipoVoto | undefined {
  if (!value) return undefined
  return TIPOS_VOTO.includes(value as TipoVoto)
    ? (value as TipoVoto)
    : undefined
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const v = await getVotacaoById(id)
  if (!v) return { title: 'Votação — Brasil a Vera' }
  const title = `Votação — ${v.descricao.slice(0, 80)}`
  const description = v.descricao.slice(0, 200)
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

export default async function VotacaoPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const filtroVoto = normalizeVoto(sp.voto)

  const v = await getVotacaoById(id)
  if (!v) notFound()

  const [proposicao, votos, votosTotais, resumoPorPartido] = await Promise.all([
    getProposicaoVinculada(v.proposicaoId),
    getVotosByVotacao(v.id, { voto: filtroVoto }),
    // Pegamos a contagem total separadamente (sem filtro) para mostrar
    // "X de Y votos" quando há filtro ativo.
    filtroVoto ? getVotosByVotacao(v.id) : Promise.resolve([]),
    getVotosResumoPorPartido(v.id),
  ])

  const totalSemFiltro = filtroVoto ? votosTotais.length : undefined

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Section title="Resumo">
          <VotosResumo
            totais={{
              sim: v.votosSim,
              nao: v.votosNao,
              abstencoes: v.abstencoes,
              ausentes: v.ausentes,
            }}
          />
        </Section>

        <Section title="Proposição vinculada">
          {proposicao ? (
            <ProposicaoVinculada proposicao={proposicao} />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhuma proposição foi vinculada a esta votação na base atual. O
              backfill liga apenas votações cuja proposição já foi ingerida (o
              conjunto de proposições é restrito ao período coberto até agora).
            </p>
          )}
        </Section>
      </div>

      <Section
        title="Por partido"
        hint="Como cada bancada se posicionou (soma dos votos individuais)."
      >
        <VotosPorPartido porPartido={resumoPorPartido} />
      </Section>

      <Section
        title="Votos individuais"
        hint="Clique no nome para ver o perfil 360° do parlamentar. Use os filtros para ver só uma direção."
      >
        <div className="mb-3 flex justify-end">
          <ExportCsvLink
            href={`/api/export/votacoes/${v.id}/votos`}
            label="Exportar todos os votos (CSV)"
          />
        </div>
        <VotosIndividuais
          votos={votos}
          filtroAtual={filtroVoto}
          totalSemFiltro={totalSemFiltro}
          votacaoId={v.id}
        />
      </Section>
    </div>
  )
}
