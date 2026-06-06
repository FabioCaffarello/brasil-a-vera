// Rota piloto: cópia-rds de /partidos/[sigla] sob /rds/ para validar a
// migração para o @fabio.caffarello/react-design-system 3.3.1. Convive em
// paralelo com a rota original (strangler fig); promoção é decisão futura.
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Tradução de classnames segue EXCLUSIVAMENTE
// `docs/migration/token-map.md` (regra: cor via classe traduzida; <Text>
// só quando o variant cobre a typography sem override pesado).

import { Card, Text } from '@fabio.caffarello/react-design-system/server'
import { notFound } from 'next/navigation'

import {
  getFidelidadeInternaMedia,
  getGastoBancadaAno,
  getPartidoOverview,
  getTop5TemasPartido,
} from '@/lib/queries/partidos'

import { BancadaList } from './_components/bancada-list'
import { FidelidadeMediaBlock } from './_components/fidelidade-media'
import { GastoBancadaBlock } from './_components/gasto-bancada'
import { PartidoHeader } from './_components/partido-header'
import { TopTemasPartido } from './_components/top-temas'

// Mesma justificativa da rota original (dynamic = 'force-dynamic'):
// `auth()` no <Navbar /> via <AuthSlot /> torna toda rota dinâmica em
// runtime; tentar prerender em build CI quebra no workerd. Caching é
// feito por query via `cached(...)` em queries/partidos.ts.
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
      title: `${siglaUpper} (rds-pilot) — Brasil à Vera`,
      alternates: { types: { 'application/rss+xml': feedHref } },
    }
  }
  const title = `${overview.sigla} (rds-pilot) — Brasil à Vera`
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

// Section reconstruída: substituiu o helper local `<section>` cru por
// composição Card (do /server) + Text/HTML cru para título e hint, seguindo
// a tabela canônica. <h2> permanece HTML cru porque a tipografia do
// original tem 4 propriedades (font-medium + text-sm + uppercase +
// tracking-wide) — `variant="label"` cobre 2 (text-sm + font-medium) mas
// uppercase + tracking-wide ainda viram override, mantendo a regra dura
// de "duas ou mais → HTML cru".
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
    <Card>
      <header className="mb-3">
        <h2 className="font-medium text-fg-tertiary text-sm uppercase tracking-wide">
          {title}
        </h2>
        {hint && (
          <Text variant="caption" className="mt-0.5 text-fg-tertiary">
            {hint}
          </Text>
        )}
      </header>
      {children}
    </Card>
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
        nomeOficial={overview.nomeOficial}
        sigla={overview.sigla}
        totalParlamentares={overview.totalParlamentares}
      />

      <Section
        hint="Parlamentares atualmente filiados a esta sigla. Trocas de partido durante a legislatura aparecem assim que a próxima ingestão capturar a nova filiação."
        title="Bancada"
      >
        <BancadaList membros={overview.parlamentares} />
      </Section>

      <Section
        hint="Quão coesa é a bancada na hora do voto — média do alinhamento individual dos membros à orientação do partido."
        title="Fidelidade interna média"
      >
        <FidelidadeMediaBlock fidelidade={fidelidade} />
      </Section>

      <Section
        hint="Temas mais frequentes nas proposições onde membros desta bancada figuram como autor ou coautor."
        title="Top 5 temas de proposições autoradas"
      >
        <TopTemasPartido temas={temas} />
      </Section>

      <Section
        hint="Cota para Exercício da Atividade Parlamentar (Câmara). Senado tem regime próprio ainda não ingerido."
        title={`Gasto CEAP — ${anoCorrente}`}
      >
        <GastoBancadaBlock ano={anoCorrente} gasto={gasto} />
      </Section>
    </div>
  )
}
