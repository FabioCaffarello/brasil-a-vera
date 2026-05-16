import { Search } from 'lucide-react'
import Link from 'next/link'

import { SearchForm } from '@/components/busca/search-form'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { ProposicaoCard } from '@/components/proposicao/proposicao-card'
import { VotacaoCard } from '@/components/votacao/votacao-card'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { SectionCard } from '@/design-system/compositions/section-card'
import { formatProposicaoRef } from '@/lib/format'
import { busca } from '@/lib/queries/busca'

export const metadata = {
  title: 'Buscar — Brasil a Vera',
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function BuscaPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''

  // Estado entry — landing-like com HeroSection gradient (D1 do plano)
  if (!query) {
    return (
      <>
        <HeroSection
          description="Pesquise por nome de parlamentar, palavra na ementa de uma proposição, descrição de votação ou referência canônica (ex.: 'PL 1234/2025')."
          kicker={
            <DataBadge
              icon={<Search className="h-3 w-3" />}
              label="Busca cruzada"
              tone="accent"
            />
          }
          title="Buscar"
          variant="gradient"
        />
        <div className="mx-auto max-w-3xl px-4 pb-12">
          <SearchForm variant="page" />
        </div>
      </>
    )
  }

  if (query.length < 2) {
    return (
      <>
        <HeroSection title="Buscar" variant="plain" />
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12">
          <SearchForm defaultValue={query} variant="page" />
          <p className="text-foreground-muted text-sm">
            Digite ao menos 2 caracteres.
          </p>
        </div>
      </>
    )
  }

  const resultados = await busca(query)
  const totalResultados =
    resultados.parlamentares.length +
    resultados.proposicoes.length +
    resultados.votacoes.length

  return (
    <>
      <HeroSection title={`Resultados para "${query}"`} variant="plain" />

      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-8">
        <SearchForm defaultValue={query} variant="page" />

        {resultados.proposicaoMatchExato && (
          <section className="rounded-lg border border-success/40 bg-success/10 p-4">
            <p className="text-foreground text-sm">
              Você digitou uma referência de proposição. Ir direto para{' '}
              <Link
                className="font-mono font-semibold text-success underline decoration-dotted underline-offset-2"
                href={`/proposicoes/${resultados.proposicaoMatchExato.tipo}/${resultados.proposicaoMatchExato.numero}/${resultados.proposicaoMatchExato.ano}`}
              >
                {formatProposicaoRef(
                  resultados.proposicaoMatchExato.tipo,
                  resultados.proposicaoMatchExato.numero,
                  resultados.proposicaoMatchExato.ano,
                )}
              </Link>
              ?
            </p>
          </section>
        )}

        {totalResultados === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-foreground-muted text-sm">
            Nenhum resultado encontrado. Tente termos mais curtos ou variantes
            (sem acento, sem aspas).
          </p>
        ) : (
          <>
            {resultados.parlamentares.length > 0 && (
              <SectionCard
                subtitle={
                  resultados.parlamentares.length === 10
                    ? 'Mostrando os 10 primeiros — refine a busca para outros.'
                    : undefined
                }
                title={`Parlamentares (${resultados.parlamentares.length})`}
              >
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {resultados.parlamentares.map((p) => (
                    <li key={p.id}>
                      <ParlamentarCard parlamentar={p} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {resultados.proposicoes.length > 0 && (
              <SectionCard
                subtitle={
                  resultados.proposicoes.length === 10
                    ? 'Mostrando as 10 primeiras — refine a busca para outras.'
                    : undefined
                }
                title={`Proposições (${resultados.proposicoes.length})`}
              >
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {resultados.proposicoes.map((p) => (
                    <li key={p.id}>
                      <ProposicaoCard proposicao={p} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {resultados.votacoes.length > 0 && (
              <SectionCard
                subtitle={
                  resultados.votacoes.length === 10
                    ? 'Mostrando as 10 primeiras — refine a busca para outras.'
                    : undefined
                }
                title={`Votações (${resultados.votacoes.length})`}
              >
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {resultados.votacoes.map((v) => (
                    <li key={v.id}>
                      <VotacaoCard votacao={v} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </>
        )}
      </div>
    </>
  )
}
