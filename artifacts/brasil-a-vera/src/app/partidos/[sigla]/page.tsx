import { notFound } from 'next/navigation'

import { BancadaList } from '@/components/partido/bancada-list'
import { FidelidadeMediaBlock } from '@/components/partido/fidelidade-media'
import { GastoBancadaBlock } from '@/components/partido/gasto-bancada'
import { PartidoHeader } from '@/components/partido/header'
import { TopTemasPartido } from '@/components/partido/top-temas'
import { getPartidosDistintos } from '@/lib/queries/parlamentares'
import {
  getFidelidadeInternaMedia,
  getGastoBancadaAno,
  getPartidoOverview,
  getTop5TemasPartido,
} from '@/lib/queries/partidos'

// SSG: lista de siglas no build (princípio 9). `revalidate` 6h espelha a
// TTL de edge cache; páginas regeneram em background quando expira.
export const revalidate = 21_600

// Em CI (e em qualquer build que rode com DATABASE_URL placeholder), a query
// falha. Retorna `[]` nesse caso — Next continua SSG mas pré-geração some;
// primeira request gera on-demand e populá o cache via `revalidate`. Build
// local com .env.local apontando ao DB real pré-gera todas as siglas.
// Princípio 13 herdado do Wave 2.0: hipótese "build local = build CI" foi
// falsificada por essa exata divergência de ambiente.
export async function generateStaticParams() {
  try {
    const siglas = await getPartidosDistintos()
    return siglas.map((sigla) => ({ sigla }))
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: 'generate_static_params_failed',
        route: '/partidos/[sigla]',
        message: err instanceof Error ? err.message : String(err),
      }),
    )
    return []
  }
}

interface PageProps {
  params: Promise<{ sigla: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { sigla } = await params
  const overview = await getPartidoOverview(sigla.toUpperCase())
  if (overview.totalParlamentares === 0) {
    return { title: `${sigla.toUpperCase()} — Brasil a Vera` }
  }
  const title = `${overview.sigla} — Brasil a Vera`
  const description = overview.nomeOficial
    ? `${overview.nomeOficial}. ${overview.totalParlamentares} parlamentares.`
    : `${overview.totalParlamentares} parlamentares.`
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

export default async function PartidoPage({ params }: PageProps) {
  const { sigla: siglaRaw } = await params
  const sigla = siglaRaw.toUpperCase()

  const overview = await getPartidoOverview(sigla)
  if (overview.totalParlamentares === 0) notFound()

  const anoCorrente = new Date().getFullYear()
  const [fidelidade, temas, gasto] = await Promise.all([
    getFidelidadeInternaMedia(sigla),
    getTop5TemasPartido(sigla),
    getGastoBancadaAno(sigla, anoCorrente),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <PartidoHeader
        sigla={overview.sigla}
        nomeOficial={overview.nomeOficial}
        totalParlamentares={overview.totalParlamentares}
      />

      <Section
        title="Bancada"
        hint="Parlamentares atualmente filiados a esta sigla. Trocas de partido durante a legislatura aparecem assim que a próxima ingestão capturar a nova filiação."
      >
        <BancadaList membros={overview.parlamentares} />
      </Section>

      <Section
        title="Fidelidade interna média"
        hint="Quão coesa é a bancada na hora do voto — média do alinhamento individual dos membros à orientação do partido."
      >
        <FidelidadeMediaBlock fidelidade={fidelidade} />
      </Section>

      <Section
        title="Top 5 temas de proposições autoradas"
        hint="Temas mais frequentes nas proposições onde membros desta bancada figuram como autor ou coautor."
      >
        <TopTemasPartido temas={temas} />
      </Section>

      <Section
        title={`Gasto CEAP — ${anoCorrente}`}
        hint="Cota para Exercício da Atividade Parlamentar (Câmara). Senado tem regime próprio ainda não ingerido."
      >
        <GastoBancadaBlock ano={anoCorrente} gasto={gasto} />
      </Section>
    </div>
  )
}
