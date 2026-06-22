// "Quem me representa" por UF (SSG — 27 estados). Os parlamentares federais em
// exercício do estado: senadores + deputados, cada card linkando ao dossiê.

import { HeroSection } from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { getRepresentantesPorUf } from '@/lib/queries/representantes'
import { isUfValida, nomeUf, UFS } from '@/lib/ufs'

interface PageProps {
  params: Promise<{ uf: string }>
}

export function generateStaticParams() {
  return UFS.map((uf) => ({ uf: uf.sigla }))
}

export async function generateMetadata({ params }: PageProps) {
  const { uf } = await params
  const nome = nomeUf(uf)
  if (!nome) return { title: 'Quem me representa? — Brasil à Vera' }
  const title = `Quem representa ${nome} — Brasil à Vera`
  const description = `Senadores e deputados federais em exercício que representam ${nome}.`
  return { title, description, openGraph: { title, description } }
}

export default async function RepresentantesUfPage({ params }: PageProps) {
  const { uf: ufParam } = await params
  const uf = ufParam.toUpperCase()
  if (!isUfValida(uf)) notFound()
  const nome = nomeUf(uf)

  const { senadores, deputados } = await getRepresentantesPorUf(uf)

  return (
    <>
      <HeroSection
        align="center"
        description={`Os parlamentares federais em exercício que representam ${nome}: senadores e deputados federais.`}
        title={`Quem representa ${nome}`}
        variant="plain"
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <Link
          className="inline-flex items-center gap-1 text-fg-tertiary text-sm hover:text-fg-primary"
          href="/quem-me-representa"
        >
          <ArrowLeft className="h-4 w-4" /> Escolher outro estado
        </Link>

        <section className="space-y-3">
          <h2 className="font-semibold text-fg-primary text-lg">
            Senadores{' '}
            <span className="text-fg-tertiary tabular-nums">
              ({senadores.length})
            </span>
          </h2>
          {senadores.length === 0 ? (
            <p className="text-fg-tertiary text-sm">
              Nenhum senador ingerido para este estado.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {senadores.map((p) => (
                <li key={p.id}>
                  <ParlamentarCard parlamentar={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-fg-primary text-lg">
            Deputados federais{' '}
            <span className="text-fg-tertiary tabular-nums">
              ({deputados.length})
            </span>
          </h2>
          {deputados.length === 0 ? (
            <p className="text-fg-tertiary text-sm">
              Nenhum deputado ingerido para este estado.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deputados.map((p) => (
                <li key={p.id}>
                  <ParlamentarCard parlamentar={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-fg-tertiary text-xs">
          Parlamentares em exercício na legislatura atual, das fontes oficiais
          (Câmara + Senado). A representação federal de cada estado é exercida
          por seus deputados federais e 3 senadores.
        </p>
      </div>
    </>
  )
}
