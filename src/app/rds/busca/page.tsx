// Onda HeroSection — cópia-rds da rota /busca sob /rds/ para validar a
// migração ao @fabio.caffarello/react-design-system 3.12.0 (a 3.12.0
// destravou HeroSection, #163, junto com /comparar e a home). Convive em
// paralelo com a rota original (strangler fig); promoção é decisão futura.
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Substituições estruturais vs original:
// - HeroSection (composição local) → HeroSection do RDS /server
//   (server-safe; API local→RDS 1:1 — kicker/title/description/variant/align;
//   precedente §3.14). 3 estados de hero preservados (entry / <2 chars /
//   resultados).
// - SectionCard (composição local)  → cópia LOCAL sobre Card compound do RDS
//   (./_components/section-card.tsx — reuso verbatim da piloto-2).
// - SearchForm (form GET server-safe) → cópia LOCAL traduzida
//   (./_components/search-form.tsx; action → /rds/busca). Button/Input das
//   cópias locais (zero-JS, token-clean).
// - ParlamentarCard/ProposicaoCard/VotacaoCard → cópias LOCAIS traduzidas
//   (reuso das traduções das 3 listagens; hrefs → /rds/, self-contained).
// - DataBadge → mantido LOCAL (import do original; sem par RDS — precedente
//   listagens/perfis, kicker do hero com tone="accent").
//
// Lógica de query (busca) e contrato dos 3 estados preservados do original.
// Cross-link do match exato de proposição → /rds/proposicoes/... (navegação
// CONTIDA na staging, mesmo precedente dos hrefs dos cards).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   text-foreground-muted → text-fg-tertiary
//   text-foreground       → text-fg-primary
//   text-success          → text-fg-success
//   border-border bg-surface → border-line-default bg-surface-base
// Tokens homônimos (sem tradução — base success/N idêntica dos dois lados,
//   ext. piloto-2 generalizada por papel utility, princípio piloto-5):
//   border-success/40 bg-success/10 (callout do match exato).

import { HeroSection } from '@fabio.caffarello/react-design-system/server'
import { Search } from 'lucide-react'
import Link from 'next/link'

import { DataBadge } from '@/design-system/compositions/data-badge'
import { formatProposicaoRef } from '@/lib/format'
import { busca } from '@/lib/queries/busca'
import { ParlamentarCard } from './_components/parlamentar-card'
import { ProposicaoCard } from './_components/proposicao-card'
import { SearchForm } from './_components/search-form'
import { SectionCard } from './_components/section-card'
import { VotacaoCard } from './_components/votacao-card'

export const metadata = {
  title: 'Buscar (rds-pilot) — Brasil à Vera',
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function BuscaPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''

  // Estado entry — landing-like com HeroSection plain (P8 Wave 8 — uniformidade)
  if (!query) {
    return (
      <>
        <HeroSection
          align="center"
          description="Pesquise por nome de parlamentar, palavra na ementa de uma proposição, descrição de votação ou referência canônica (ex.: 'PL 1234/2025')."
          kicker={
            <DataBadge
              icon={<Search className="h-3 w-3" />}
              label="Busca cruzada"
              source="L1 · 2 fontes"
              tone="accent"
            />
          }
          title="Buscar"
          variant="plain"
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
        <HeroSection
          align="center"
          kicker={
            <DataBadge
              icon={<Search className="h-3 w-3" />}
              label="Busca cruzada"
              source="L1 · 2 fontes"
              tone="accent"
            />
          }
          title="Buscar"
          variant="plain"
        />
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12">
          <SearchForm defaultValue={query} variant="page" />
          <p className="text-fg-tertiary text-sm">
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
      <HeroSection
        align="center"
        kicker={
          <DataBadge
            icon={<Search className="h-3 w-3" />}
            label="Busca cruzada"
            source="L1 · 2 fontes"
            tone="accent"
          />
        }
        title={`Resultados para "${query}"`}
        variant="plain"
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-8">
        <SearchForm defaultValue={query} variant="page" />

        {resultados.proposicaoMatchExato && (
          <section className="rounded-lg border border-success/40 bg-success/10 p-4">
            <p className="text-fg-primary text-sm">
              Você digitou uma referência de proposição. Ir direto para{' '}
              <Link
                className="font-mono font-semibold text-fg-success underline decoration-dotted underline-offset-2"
                href={`/rds/proposicoes/${resultados.proposicaoMatchExato.tipo}/${resultados.proposicaoMatchExato.numero}/${resultados.proposicaoMatchExato.ano}`}
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
          <p className="rounded-lg border border-line-default bg-surface-base p-6 text-fg-tertiary text-sm">
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
