// Tema (ADR-050) — proposições do assunto + quem mais as autora. SSG por tema.

import { HeroSection } from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { formatProposicaoRef } from '@/lib/format'
import { getTema, getTemas } from '@/lib/queries/temas'

interface PageProps {
  params: Promise<{ codigo: string }>
}

export async function generateStaticParams() {
  const temas = await getTemas()
  return temas.map((t) => ({ codigo: String(t.codigo) }))
}

export async function generateMetadata({ params }: PageProps) {
  const { codigo } = await params
  const tema = await getTema(Number(codigo))
  if (!tema) return { title: 'Tema — Brasil à Vera' }
  const title = `${tema.nome} — Temas — Brasil à Vera`
  const description = `Proposições sobre ${tema.nome} e os parlamentares que mais as propõem.`
  return { title, description, openGraph: { title, description } }
}

export default async function TemaPage({ params }: PageProps) {
  const { codigo } = await params
  const n = Number(codigo)
  if (!Number.isInteger(n)) notFound()
  const tema = await getTema(n)
  if (!tema) notFound()

  return (
    <>
      <HeroSection
        align="center"
        description={`${tema.total} ${tema.total === 1 ? 'proposição classificada' : 'proposições classificadas'} neste tema e quem mais as propõe.`}
        title={tema.nome}
        variant="plain"
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <Link
          className="inline-flex items-center gap-1 text-fg-tertiary text-sm hover:text-fg-primary"
          href="/temas"
        >
          <ArrowLeft className="h-4 w-4" /> Todos os temas
        </Link>

        <section className="space-y-3">
          <h2 className="font-semibold text-fg-primary text-lg">
            Quem mais propõe sobre o tema
          </h2>
          {tema.parlamentares.length === 0 ? (
            <p className="text-fg-tertiary text-sm">
              Nenhum autor com parlamentar identificado (autoria externa ou de
              outra casa não entra).
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tema.parlamentares.map((p) => (
                <li key={p.id}>
                  <Link
                    className="flex items-center justify-between gap-3 rounded-lg border border-line-default p-3 hover:bg-surface-raised"
                    href={`/parlamentares/${p.id}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-fg-primary text-sm">
                        {p.nome}
                      </span>
                      <span className="text-fg-tertiary text-xs">
                        {p.partidoSigla} · {p.uf}
                      </span>
                    </span>
                    <span className="shrink-0 text-fg-tertiary text-xs tabular-nums">
                      {p.proposicoes}{' '}
                      {p.proposicoes === 1 ? 'proposição' : 'proposições'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-fg-primary text-lg">
              Proposições recentes
            </h2>
            <Link
              className="text-fg-primary text-sm hover:underline"
              href={`/proposicoes?tema=${tema.codigo}`}
            >
              Ver todas as proposições deste tema →
            </Link>
          </div>
          <ul className="space-y-2">
            {tema.proposicoes.map((p) => (
              <li
                className="rounded-lg border border-line-default p-3"
                key={p.proposicaoId}
              >
                <Link
                  className="font-medium font-mono text-fg-primary text-xs hover:text-fg-tertiary hover:underline"
                  href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
                >
                  {formatProposicaoRef(p.tipo, p.numero, p.ano)}
                </Link>
                <p className="mt-1.5 text-fg-primary text-sm">{p.ementa}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-fg-tertiary text-xs">
          Classificação temática oficial da Câmara. "Quem mais propõe" conta
          autoria das proposições ingeridas classificadas neste tema — é
          produção legislativa no assunto, não medida de engajamento total.
        </p>
      </div>
    </>
  )
}
