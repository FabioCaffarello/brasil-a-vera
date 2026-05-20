import { notFound } from 'next/navigation'

import { BancadaList } from '@/components/partido/bancada-list'
import { FidelidadeMediaBlock } from '@/components/partido/fidelidade-media'
import { GastoBancadaBlock } from '@/components/partido/gasto-bancada'
import { PartidoHeader } from '@/components/partido/header'
import { TopTemasPartido } from '@/components/partido/top-temas'
import {
  getFidelidadeInternaMedia,
  getGastoBancadaAno,
  getPartidoOverview,
  getTop5TemasPartido,
} from '@/lib/queries/partidos'

// Dynamic render — `auth()` no layout via <AuthSlot /> (Sprint 4.2 PR 1)
// torna toda página dinâmica em runtime. O combo anterior (`revalidate`
// constante + `generateStaticParams` retornando `[]` em build CI) crashou
// no workerd com "An error occurred in the Server Components render" em
// 100% das requests pós-merge do PR #152. Empíricamente confirmado em
// `cf:preview` reproduzindo o build CI (placeholder DATABASE_URL).
//
// Caching server-side é feito por query via `cached(...)` em
// src/lib/queries/partidos.ts (Workers caches.default API, TTL
// `partidoOverview`). Edge HTML caching não é usado nesta rota — o ganho
// vem de hits no cache de query, não de prerender.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ sigla: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { sigla } = await params
  const siglaUpper = sigla.toUpperCase()
  const overview = await getPartidoOverview(siglaUpper)
  const feedHref = `/feed/votacoes/partido/${encodeURIComponent(siglaUpper)}`
  if (overview.totalParlamentares === 0) {
    return {
      title: `${siglaUpper} — Brasil à Vera`,
      alternates: { types: { 'application/rss+xml': feedHref } },
    }
  }
  const title = `${overview.sigla} — Brasil à Vera`
  const description = overview.nomeOficial
    ? `${overview.nomeOficial}. ${overview.totalParlamentares} parlamentares.`
    : `${overview.totalParlamentares} parlamentares.`
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
    alternates: { types: { 'application/rss+xml': feedHref } },
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
