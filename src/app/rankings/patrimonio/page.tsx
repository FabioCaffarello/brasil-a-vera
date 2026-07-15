// Leaderboard de variação patrimonial durante o mandato (ADR-047).
// Dado: TSE declarações de bens 2014/2018/2022, corrigido por IPCA (ADR-036).
// Cobertura: Câmara 100% + Senado 88,9% (72/81 — 9 suplentes sem registro TSE
// 2014–2022, ver ADR-063). Senadores com CPF aparecem desde Sprint 39/40.
// Cache 24h (mesma cadência do getVariacaoPatrimonialRanking).

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { formatBRL } from '@/lib/format'
import { getLeaderboardPatrimonio } from '@/lib/queries/variacao-patrimonial'

export const revalidate = 86400

export const metadata = {
  title: 'Variação patrimonial no mandato — Brasil à Vera',
  description:
    'Ranking dos parlamentares com maior e menor variação de patrimônio entre dois pleitos consecutivos. Corrigido pelo IPCA. Fonte: TSE.',
}

const TOP_N = 20

function sinal(delta: string) {
  const n = parseFloat(delta)
  if (n > 0) return '+'
  if (n < 0) return '−'
  return ''
}

function classeDelta(delta: string) {
  const n = parseFloat(delta)
  if (n > 0) return 'text-green-700 dark:text-green-400'
  if (n < 0) return 'text-red-700 dark:text-red-400'
  return 'text-fg-secondary'
}

interface RowProps {
  rank: number
  entry: Awaited<ReturnType<typeof getLeaderboardPatrimonio>>[number]
}

function LeaderboardRow({ rank, entry }: RowProps) {
  const { variacao } = entry
  const deltaAbs = parseFloat(variacao.deltaRealAbs)
  const pct = variacao.deltaPct

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
          {entry.partidoSigla ?? '—'}/{entry.uf} · {variacao.pleitoDe}→
          {variacao.pleitoAte}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-fg-tertiary text-xs">
          {formatBRL(variacao.realDe)} → {formatBRL(variacao.realAte)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`font-mono font-semibold text-sm ${classeDelta(variacao.deltaRealAbs)}`}
        >
          {sinal(variacao.deltaRealAbs)}
          {formatBRL(Math.abs(deltaAbs).toString())}
        </p>
        {pct !== null && (
          <p className={`text-xs ${classeDelta(variacao.deltaRealAbs)}`}>
            {sinal(variacao.deltaRealAbs)}
            {Math.abs(pct).toFixed(1)}%
          </p>
        )}
      </div>
    </li>
  )
}

export default async function RankingPatrimonioPage() {
  const leaderboard = await getLeaderboardPatrimonio()
  const gainers = leaderboard.slice(0, TOP_N)
  const losers = leaderboard.slice(-TOP_N).reverse()

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Rankings', href: '/rankings' },
          { label: 'Patrimônio no mandato' },
        ]}
      />

      <div className="mt-6 mb-2">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Variação patrimonial no mandato
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Diferença de patrimônio entre dois pleitos consecutivos, corrigida
          pelo IPCA (ADR-047). Fonte: TSE — declarações de bens 2014, 2018 e
          2022. Câmara: 100%. Senado: 88,9% (9 suplentes sem registro TSE
          2014–2022 ficam de fora — ver{' '}
          <a href="/docs/metodologia" className="underline">
            metodologia
          </a>
          ).
        </p>
      </div>

      <p className="mb-8 text-fg-tertiary text-xs">
        Variação real calculada sobre {leaderboard.length} parlamentares com
        pelo menos dois pleitos declarados.
      </p>

      <div className="space-y-8">
        <section aria-labelledby="maiores-ganhos">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" aria-hidden />
            <h2
              className="font-semibold text-fg-primary text-lg"
              id="maiores-ganhos"
            >
              Top {TOP_N} — Maior valorização
            </h2>
          </div>
          <div className="rounded-lg border border-line-default bg-surface-base">
            <ul aria-label="Parlamentares com maior valorização patrimonial">
              {gainers.map((entry, i) => (
                <LeaderboardRow key={entry.id} entry={entry} rank={i + 1} />
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="maiores-perdas">
          <div className="mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" aria-hidden />
            <h2
              className="font-semibold text-fg-primary text-lg"
              id="maiores-perdas"
            >
              Top {TOP_N} — Maior desvalorização
            </h2>
          </div>
          <div className="rounded-lg border border-line-default bg-surface-base">
            <ul aria-label="Parlamentares com maior desvalorização patrimonial">
              {losers.map((entry, i) => (
                <LeaderboardRow key={entry.id} entry={entry} rank={i + 1} />
              ))}
            </ul>
          </div>
        </section>
      </div>

      <p className="mt-8 text-fg-tertiary text-xs">
        Variação patrimonial não implica irregularidade — é fato factual de
        posição (ADR-040). Patrimônio declarado pode omitir bens ou incluir
        estimativas imprecisas. A correção IPCA usa o deflator oficial do IBGE.
      </p>
    </div>
  )
}
