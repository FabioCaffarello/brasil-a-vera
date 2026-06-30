// Ranking de produção legislativa — Sprint 26.
// Fonte: estatistica_parlamentar_agregada.proposicoes_count (atualizado pelo seed diário).
// Cache 24h — mesma cadência do seed.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { getRankingProposicoes } from '@/lib/queries/rankings'

export const revalidate = 86400

export const metadata = {
  title: 'Produção legislativa — Rankings — Brasil à Vera',
  description:
    'Parlamentares com maior número de proposições apresentadas na legislatura corrente. Fonte: API Câmara dos Deputados e Senado Federal.',
}

const TOP_N = 30

interface RowProps {
  rank: number
  entry: Awaited<ReturnType<typeof getRankingProposicoes>>[number]
}

function LeaderboardRow({ rank, entry }: RowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-line-default py-3 last:border-b-0">
      <span className="w-7 shrink-0 text-right font-mono text-fg-tertiary text-sm">
        {rank}
      </span>

      <Link
        className="shrink-0"
        href={`/parlamentares/${entry.id}`}
        tabIndex={-1}
      >
        <ParlamentarAvatar
          className="size-9"
          loading="lazy"
          nome={entry.nome}
          size="sm"
          urlFoto={entry.urlFoto}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          className="truncate font-medium text-fg-primary text-sm hover:underline"
          href={`/parlamentares/${entry.id}`}
        >
          {entry.nome}
        </Link>
        <p className="text-fg-tertiary text-xs">
          {entry.partidoSigla ?? '—'}/{entry.uf} ·{' '}
          {entry.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono font-semibold text-fg-primary text-sm">
          {entry.proposicoesCount}
        </p>
        <p className="text-fg-tertiary text-xs">proposições</p>
      </div>
    </li>
  )
}

export default async function RankingProposicoesPage() {
  const ranking = await getRankingProposicoes(TOP_N)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Rankings', href: '/rankings' },
          { label: 'Produção legislativa' },
        ]}
      />

      <div className="mt-6 mb-2">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Produção legislativa
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Parlamentares que mais apresentaram proposições na legislatura
          corrente. Inclui projetos de lei, emendas, requerimentos e demais
          matérias registradas nas APIs da Câmara e do Senado.
        </p>
      </div>

      <p className="mb-8 text-fg-tertiary text-xs">
        {ranking.length} parlamentares com proposição registrada. Volume alto
        não implica qualidade — é fato factual de produção.
      </p>

      <div className="rounded-lg border border-line-default bg-surface-base">
        <div className="flex items-center gap-2 border-b border-line-default px-4 py-3">
          <FileText className="h-4 w-4 text-fg-tertiary" aria-hidden />
          <h2 className="font-semibold text-fg-primary text-base">
            Top {TOP_N} — Maior número de proposições
          </h2>
        </div>
        <ul aria-label="Parlamentares com maior produção legislativa">
          {ranking.map((entry, i) => (
            <LeaderboardRow key={entry.id} entry={entry} rank={i + 1} />
          ))}
        </ul>
      </div>

      <p className="mt-8 text-fg-tertiary text-xs">
        Contagem baseada nas proposições vinculadas ao parlamentar como autor
        principal ou coautor, conforme dados das APIs oficiais. A mesma
        proposição pode ser contada para múltiplos autores.
      </p>
    </main>
  )
}
