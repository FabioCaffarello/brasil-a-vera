// Ranking de uso da Cota Parlamentar (CEAP) — Sprint 16.0.
// Fonte: estatistica_parlamentar_agregada.gasto_total_ano (ano corrente).
// Cache 24h — mesma cadência do seed de agregados.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { Receipt } from 'lucide-react'
import Link from 'next/link'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { formatBRL } from '@/lib/format'
import { getRankingGastos } from '@/lib/queries/rankings'

export const revalidate = 86400

export const metadata = {
  title: 'Maiores gastos da cota parlamentar — Brasil à Vera',
  description:
    'Ranking dos parlamentares com maior uso da Cota para o Exercício da Atividade Parlamentar (CEAP) no ano corrente. Fonte: Portal da Transparência.',
}

const TOP_N = 30

interface RowProps {
  rank: number
  entry: Awaited<ReturnType<typeof getRankingGastos>>[number]
}

function LeaderboardRow({ rank, entry }: RowProps) {
  const percentil = entry.percentilGastoCasa
    ? Math.round(parseFloat(entry.percentilGastoCasa))
    : null

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
          {percentil !== null && ` · percentil ${percentil}`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono font-semibold text-fg-primary text-sm">
          {formatBRL(entry.gastoTotalAno)}
        </p>
      </div>
    </li>
  )
}

export default async function RankingGastosPage() {
  const ranking = await getRankingGastos(TOP_N)

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Rankings', href: '/rankings' },
          { label: 'Gastos da cota' },
        ]}
      />

      <div className="mt-6 mb-2">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Maiores gastos da cota parlamentar
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Total de uso da CEAP (Cota para o Exercício da Atividade Parlamentar)
          no ano corrente. O valor inclui passagens, alimentação, hospedagem,
          escritório de apoio e outros itens cobertos pela cota. Cada casa tem
          teto distinto — a comparação entre Câmara e Senado deve considerar
          esse contexto.
        </p>
      </div>

      <p className="mb-8 text-fg-tertiary text-xs">
        {ranking.length} parlamentares com gasto registrado. Fonte: Portal da
        Transparência.
      </p>

      <div className="rounded-lg border border-line-default bg-surface-base">
        <div className="flex items-center gap-2 border-b border-line-default px-4 py-3">
          <Receipt className="h-4 w-4 text-fg-tertiary" aria-hidden />
          <h2 className="font-semibold text-fg-primary text-base">
            Top {TOP_N} — Maior uso da cota (ano corrente)
          </h2>
        </div>
        <ul aria-label="Parlamentares com maior gasto da cota parlamentar">
          {ranking.map((entry, i) => (
            <LeaderboardRow key={entry.id} entry={entry} rank={i + 1} />
          ))}
        </ul>
      </div>

      <p className="mt-8 text-fg-tertiary text-xs">
        Alto uso da cota não implica irregularidade — é fato factual de consumo.
        Irregularidades são apuradas pelo Conselho de Ética. Valores são
        declarados pelo próprio parlamentar e auditados internamente pela Casa.
      </p>
    </div>
  )
}
