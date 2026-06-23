// "Quem me representa" por UF (SSG — 27 estados). Os parlamentares federais em
// exercício do estado: senadores + deputados, cada card linkando ao dossiê.

import {
  Breadcrumb,
  HeroSection,
} from '@fabio.caffarello/react-design-system/server'
import { Building2, Gauge, Landmark, Users } from 'lucide-react'
import { notFound } from 'next/navigation'

import { RepresentantesSection } from '@/components/parlamentar/representantes-section'
import { KpiCard } from '@/design-system/compositions/kpi-card'
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
  const nome = nomeUf(uf) ?? uf

  const { senadores, deputados } = await getRepresentantesPorUf(uf)

  const todos = [...senadores, ...deputados]
  const total = todos.length
  const comDado = todos.filter((p) => p.pctAlinhamento != null).length
  const pctComDado = total > 0 ? Math.round((comDado / total) * 100) : 0

  const secoes = (
    <>
      <RepresentantesSection
        emptyLabel="Nenhum senador ingerido para este estado."
        icon={<Landmark className="h-5 w-5" />}
        id="senadores"
        parlamentares={senadores}
        title="Senadores"
      />

      <RepresentantesSection
        emptyLabel="Nenhum deputado ingerido para este estado."
        icon={<Building2 className="h-5 w-5" />}
        id="deputados"
        parlamentares={deputados}
        title="Deputados federais"
      />
    </>
  )

  return (
    <>
      <HeroSection
        align="center"
        description={`Os parlamentares federais em exercício que representam ${nome}: senadores e deputados federais.`}
        title={`Quem representa ${nome}`}
        variant="plain"
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Quem me representa?', href: '/quem-me-representa' },
            { label: nome },
          ]}
        />

        {total > 0 ? (
          <KpiCard
            aria-label={`Resumo da representação de ${nome}`}
            items={[
              {
                icon: <Users className="h-5 w-5" />,
                label: 'Representantes',
                value: String(total),
              },
              {
                icon: <Landmark className="h-5 w-5" />,
                label: 'Senadores',
                value: String(senadores.length),
              },
              {
                icon: <Building2 className="h-5 w-5" />,
                label: 'Deputados',
                value: String(deputados.length),
              },
              {
                icon: <Gauge className="h-5 w-5" />,
                label: 'Com dado de alinhamento',
                value: `${pctComDado}%`,
              },
            ]}
          />
        ) : null}

        {secoes}

        <p className="text-fg-tertiary text-xs">
          Parlamentares em exercício na legislatura atual, das fontes oficiais
          (Câmara + Senado). A representação federal de cada estado é exercida
          por seus deputados federais e 3 senadores.
        </p>
      </div>
    </>
  )
}
