// Ranking de alinhamento partidário — Sprint 16.0.
// Fonte: estatistica_parlamentar_agregada.pct_alinhamento.
// Requer >= 10 votações analisadas para entrar no ranking (amostra mínima).
// Cache 24h — mesma cadência do seed de agregados.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import Link from 'next/link'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { getRankingAlinhamento } from '@/lib/queries/rankings'

export const revalidate = 86400

export const metadata = {
  title: 'Disciplina partidária — Brasil à Vera',
  description:
    'Ranking dos parlamentares mais disciplinados e mais independentes em relação ao partido. Calculado sobre votações nominais no plenário.',
}

const TOP_N = 25

interface RowProps {
  rank: number
  entry: Awaited<
    ReturnType<typeof getRankingAlinhamento>
  >['disciplinados'][number]
  variant: 'disciplinado' | 'independente'
}

function formatPct(pct: string) {
  return `${parseFloat(pct).toFixed(1)}%`
}

function LeaderboardRow({ rank, entry, variant }: RowProps) {
  const colorClass =
    variant === 'disciplinado'
      ? 'text-blue-700 dark:text-blue-400'
      : 'text-amber-700 dark:text-amber-400'

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
          {entry.casa === 'CAMARA' ? 'Câmara' : 'Senado'} ·{' '}
          {entry.votacoesAnalisadas} votações
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={`font-mono font-semibold text-sm ${colorClass}`}>
          {formatPct(entry.pctAlinhamento)}
        </p>
        <p className="text-fg-tertiary text-xs">
          {variant === 'disciplinado' ? 'c/ o partido' : 'divergência'}
        </p>
      </div>
    </li>
  )
}

export default async function RankingAlinhamentoPage() {
  const { disciplinados, independentes } = await getRankingAlinhamento(TOP_N)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Rankings', href: '/rankings' },
          { label: 'Disciplina partidária' },
        ]}
      />

      <div className="mt-6 mb-2">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Disciplina partidária
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Percentual de votações nominais no plenário em que o parlamentar votou
          na mesma direção que a maioria do seu partido ou bloco. Inclui apenas
          parlamentares com ao menos 10 votações analisadas.
        </p>
      </div>

      <p className="mb-8 text-fg-tertiary text-xs">
        Calculado sobre votações nominais (excluindo ausências e abstenções).
        Alta disciplina significa coerência com o partido — não implica acerto
        ou erro de mérito.
      </p>

      <div className="space-y-8">
        <section aria-labelledby="mais-disciplinados">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" aria-hidden />
            <h2
              className="font-semibold text-fg-primary text-lg"
              id="mais-disciplinados"
            >
              Top {disciplinados.length} — Mais disciplinados
            </h2>
          </div>
          <div className="rounded-lg border border-line-default bg-surface-base">
            <ul aria-label="Parlamentares com maior disciplina partidária">
              {disciplinados.map((entry, i) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  rank={i + 1}
                  variant="disciplinado"
                />
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="mais-independentes">
          <div className="mb-3 flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-amber-600" aria-hidden />
            <h2
              className="font-semibold text-fg-primary text-lg"
              id="mais-independentes"
            >
              Top {independentes.length} — Mais independentes
            </h2>
          </div>
          <div className="rounded-lg border border-line-default bg-surface-base">
            <ul aria-label="Parlamentares com maior independência partidária">
              {independentes.map((entry, i) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  rank={i + 1}
                  variant="independente"
                />
              ))}
            </ul>
          </div>
        </section>
      </div>

      <p className="mt-8 text-fg-tertiary text-xs">
        Disciplina e independência são descrições factuais de comportamento de
        voto. Nenhuma implica avaliação de mérito.
      </p>
    </main>
  )
}
