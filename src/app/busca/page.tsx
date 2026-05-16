import Link from 'next/link'
import { SearchForm } from '@/components/busca/search-form'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { ProposicaoCard } from '@/components/proposicao/proposicao-card'
import { VotacaoCard } from '@/components/votacao/votacao-card'
import { formatProposicaoRef } from '@/lib/format'
import { busca } from '@/lib/queries/busca'

export const metadata = {
  title: 'Buscar — Brasil a Vera',
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
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
    <section>
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

export default async function BuscaPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''

  if (!query) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
          Buscar
        </h1>
        <p className="mb-6 text-foreground-muted text-sm">
          Pesquise por nome de parlamentar, palavra na ementa de uma proposição,
          descrição de votação ou referência canônica (ex.: "PL 1234/2025").
        </p>
        <SearchForm variant="page" />
      </div>
    )
  }

  if (query.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
          Buscar
        </h1>
        <SearchForm variant="page" defaultValue={query} />
        <p className="mt-4 text-foreground-muted text-sm">
          Digite ao menos 2 caracteres.
        </p>
      </div>
    )
  }

  const resultados = await busca(query)
  const totalResultados =
    resultados.parlamentares.length +
    resultados.proposicoes.length +
    resultados.votacoes.length

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="mb-3 font-semibold text-2xl text-foreground tracking-tight">
          Resultados para “{query}”
        </h1>
        <SearchForm variant="page" defaultValue={query} />
      </header>

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
            <Section
              title={`Parlamentares (${resultados.parlamentares.length})`}
              hint={
                resultados.parlamentares.length === 10
                  ? 'Mostrando os 10 primeiros — refine a busca para outros.'
                  : undefined
              }
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {resultados.parlamentares.map((p) => (
                  <li key={p.id}>
                    <ParlamentarCard parlamentar={p} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {resultados.proposicoes.length > 0 && (
            <Section
              title={`Proposições (${resultados.proposicoes.length})`}
              hint={
                resultados.proposicoes.length === 10
                  ? 'Mostrando as 10 primeiras — refine a busca para outras.'
                  : undefined
              }
            >
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {resultados.proposicoes.map((p) => (
                  <li key={p.id}>
                    <ProposicaoCard proposicao={p} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {resultados.votacoes.length > 0 && (
            <Section
              title={`Votações (${resultados.votacoes.length})`}
              hint={
                resultados.votacoes.length === 10
                  ? 'Mostrando as 10 primeiras — refine a busca para outras.'
                  : undefined
              }
            >
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {resultados.votacoes.map((v) => (
                  <li key={v.id}>
                    <VotacaoCard votacao={v} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
