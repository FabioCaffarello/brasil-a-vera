// Perfil de partido — promovido ao RDS (3ª promoção da migração
// strangler-fig, ADR-033; 1ª rota rica, com _components/ consolidados
// em src/components/partido/). Consome o design system
// @fabio.caffarello/react-design-system — tokens traduzidos pela tabela
// canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Dynamic render — `auth()` no layout via <AuthSlot /> (Sprint 4.2 PR 1)
// torna toda página dinâmica em runtime. O combo anterior (`revalidate`
// constante + `generateStaticParams` retornando `[]` em build CI) crashou
// no workerd em 100% das requests pós-merge do PR #152. Caching
// server-side é feito por query via `cached(...)` em
// src/lib/queries/partidos.ts (Workers caches.default API).

import {
  Breadcrumb,
  Card,
  Text,
} from '@fabio.caffarello/react-design-system/server'
import { notFound } from 'next/navigation'

import { AlinhamentoMedioBancadaBlock } from '@/components/partido/alinhamento-medio'
import { BancadaList } from '@/components/partido/bancada-list'
import { DistribuicaoBancadaBlock } from '@/components/partido/distribuicao-bancada'
import { FidelidadeMediaBlock } from '@/components/partido/fidelidade-media'
import { GastoBancadaBlock } from '@/components/partido/gasto-bancada'
import { PartidoHeader } from '@/components/partido/header'
import { TopTemasPartido } from '@/components/partido/top-temas'
import {
  type FiliacaoMovimentacao,
  getAlinhamentoMedioBancada,
  getFidelidadeInternaMedia,
  getFiliacoesRecentes,
  getGastoBancadaAno,
  getGastoCategoriasBancada,
  getPartidoOverview,
  getTop5TemasPartido,
} from '@/lib/queries/partidos'

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

// Section: <Card> (do /server) + Text/HTML cru para título e hint,
// seguindo a tabela canônica. <h2> permanece HTML cru porque a
// tipografia tem 4 propriedades (font-medium + text-sm + uppercase +
// tracking-wide) — `variant="label"` cobre 2, as outras viram override,
// mantendo a regra dura de "duas ou mais → HTML cru".
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

function MovimentacoesFiliacoes({
  movimentacoes,
}: {
  movimentacoes: FiliacaoMovimentacao[]
}) {
  return (
    <ul className="space-y-2">
      {movimentacoes.map((m) => (
        <li
          className="flex flex-wrap items-center gap-2 text-sm"
          key={`${m.parlamentarId}-${m.tipo}-${m.data}`}
        >
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
              m.tipo === 'ENTRADA'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
          </span>
          <span className="font-medium text-fg-primary">
            {m.parlamentarNome}
          </span>
          <span className="text-fg-tertiary text-xs">
            {m.parlamentarUf} ·{' '}
            {m.parlamentarCasa === 'CAMARA' ? 'Câmara' : 'Senado'}
          </span>
          <span className="ml-auto font-mono text-fg-tertiary text-xs tabular-nums">
            {new Date(m.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default async function PartidoPage({ params }: PageProps) {
  const { sigla: siglaRaw } = await params
  const sigla = siglaRaw.toUpperCase()

  const overview = await getPartidoOverview(sigla)
  if (overview.totalParlamentares === 0) notFound()

  const anoCorrente = new Date().getFullYear()
  const [
    fidelidade,
    temas,
    gasto,
    alinhamentoMedio,
    gastoCategorias,
    filiacoesRecentes,
  ] = await Promise.all([
    getFidelidadeInternaMedia(sigla),
    getTop5TemasPartido(sigla),
    getGastoBancadaAno(sigla, anoCorrente),
    getAlinhamentoMedioBancada(sigla),
    getGastoCategoriasBancada(sigla, anoCorrente),
    getFiliacoesRecentes(sigla),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Partidos', href: '/partidos' },
          { label: sigla },
        ]}
      />
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
        hint="Distribuição por Casa e pelos estados com maior representação."
        title="Composição da bancada"
      >
        <DistribuicaoBancadaBlock membros={overview.parlamentares} />
      </Section>

      <Section
        // Hint federation-aware (ADR-041): para partido federado não existe
        // orientação da sigla, então o subtítulo NÃO pode prometer "alinhamento
        // à orientação do partido" — seria contradito pelo corpo do bloco.
        // Nenhuma superfície afirma o que outra nega.
        hint={
          fidelidade.emFederacao
            ? 'Quão coesa é a bancada na hora do voto.'
            : 'Quão coesa é a bancada na hora do voto — média do alinhamento individual dos membros à orientação do partido.'
        }
        title="Fidelidade interna média"
      >
        <FidelidadeMediaBlock fidelidade={fidelidade} sigla={overview.sigla} />
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
        <GastoBancadaBlock
          ano={anoCorrente}
          categorias={gastoCategorias}
          gasto={gasto}
        />
      </Section>

      <Section
        hint="Com que frequência os membros votam na mesma direção que a maioria do partido ou bloco. Membros com menos de 10 votações analisadas são excluídos."
        title="Alinhamento médio da bancada"
      >
        <AlinhamentoMedioBancadaBlock
          alinhamento={alinhamentoMedio}
          sigla={sigla}
        />
      </Section>

      {filiacoesRecentes.length > 0 && (
        <Section
          hint="Entradas e saídas dos últimos 365 dias registradas na base de filiações."
          title="Movimentações recentes"
        >
          <MovimentacoesFiliacoes movimentacoes={filiacoesRecentes} />
        </Section>
      )}
    </div>
  )
}
