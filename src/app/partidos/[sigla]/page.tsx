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
  DetailLayout,
  type DetailSection,
} from '@fabio.caffarello/react-design-system'
import {
  Breadcrumb,
  DataBadge,
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
          <span className="shrink-0">
            <DataBadge
              label={m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
              tone={m.tipo === 'ENTRADA' ? 'success' : 'error'}
            />
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

  const sections: DetailSection[] = [
    {
      id: 'bancada',
      navLabel: 'Bancada',
      title: 'Bancada',
      subtitle:
        'Parlamentares atualmente filiados a esta sigla. Trocas de partido durante a legislatura aparecem assim que a próxima ingestão capturar a nova filiação.',
      content: <BancadaList membros={overview.parlamentares} />,
    },
    {
      id: 'composicao',
      navLabel: 'Composição',
      title: 'Composição da bancada',
      subtitle:
        'Distribuição por Casa e pelos estados com maior representação.',
      content: <DistribuicaoBancadaBlock membros={overview.parlamentares} />,
    },
    {
      // Hint federation-aware (ADR-041): para partido federado não existe
      // orientação da sigla, então o subtítulo NÃO pode prometer "alinhamento
      // à orientação do partido" — seria contradito pelo corpo do bloco.
      id: 'fidelidade',
      navLabel: 'Fidelidade',
      title: 'Fidelidade interna média',
      subtitle: fidelidade.emFederacao
        ? 'Quão coesa é a bancada na hora do voto.'
        : 'Quão coesa é a bancada na hora do voto — média do alinhamento individual dos membros à orientação do partido.',
      content: (
        <FidelidadeMediaBlock fidelidade={fidelidade} sigla={overview.sigla} />
      ),
    },
    {
      id: 'temas',
      navLabel: 'Temas',
      title: 'Top 5 temas de proposições autoradas',
      subtitle:
        'Temas mais frequentes nas proposições onde membros desta bancada figuram como autor ou coautor.',
      content: <TopTemasPartido temas={temas} />,
    },
    {
      id: 'gasto',
      navLabel: 'Gasto CEAP',
      title: `Gasto CEAP — ${anoCorrente}`,
      subtitle:
        'Cota para Exercício da Atividade Parlamentar (Câmara). Senado tem regime próprio ainda não ingerido.',
      content: (
        <GastoBancadaBlock
          ano={anoCorrente}
          categorias={gastoCategorias}
          gasto={gasto}
        />
      ),
    },
    {
      id: 'alinhamento',
      navLabel: 'Alinhamento',
      title: 'Alinhamento médio da bancada',
      subtitle:
        'Com que frequência os membros votam na mesma direção que a maioria do partido ou bloco. Membros com menos de 10 votações analisadas são excluídos.',
      content: (
        <AlinhamentoMedioBancadaBlock
          alinhamento={alinhamentoMedio}
          sigla={sigla}
        />
      ),
    },
  ]

  if (filiacoesRecentes.length > 0) {
    sections.push({
      id: 'movimentacoes',
      navLabel: 'Movimentações',
      title: 'Movimentações recentes',
      subtitle:
        'Entradas e saídas dos últimos 365 dias registradas na base de filiações.',
      content: <MovimentacoesFiliacoes movimentacoes={filiacoesRecentes} />,
    })
  }

  return (
    <DetailLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Partidos', href: '/partidos' },
            { label: sigla },
          ]}
        />
      }
      header={
        <PartidoHeader
          nomeOficial={overview.nomeOficial}
          sigla={overview.sigla}
          totalParlamentares={overview.totalParlamentares}
        />
      }
      sections={sections}
      stickyNavTop="3.5rem"
    />
  )
}
