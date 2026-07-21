// Ranking de coerência de voto — Sprint 33.
// Fonte: estatistica_parlamentar_agregada.pares_contraditorios_count.
// Pares contraditórios = votos opostos em proposições de mesmo tema mas
// direções semânticas opostas (RESTRITIVA vs PERMISSIVA). Algoritmo idêntico
// ao Motor de Coerência (coerencia.ts / direcao-classifier.ts).

import {
  Breadcrumb,
  HeroSection,
} from '@fabio.caffarello/react-design-system/server'
import { GitFork, GitMerge } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { getRankingCoerencia } from '@/lib/queries/rankings'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Coerência de voto — Brasil à Vera',
  description:
    'Ranking dos parlamentares com mais e menos contradições de voto: pares de votações opostas sobre proposições do mesmo tema.',
}

const TOP_N = 25

interface RowProps {
  rank: number
  entry: Awaited<ReturnType<typeof getRankingCoerencia>>['maisPares'][number]
  variant: 'incoerente' | 'coerente'
}

function LeaderboardRow({ rank, entry, variant }: RowProps) {
  const colorClass =
    variant === 'incoerente'
      ? 'text-red-700 dark:text-red-400'
      : 'text-green-700 dark:text-green-400'

  const label =
    variant === 'incoerente'
      ? entry.paresContraditoriosCount === 1
        ? '1 par'
        : `${entry.paresContraditoriosCount} pares`
      : entry.paresContraditoriosCount === 0
        ? 'nenhum'
        : entry.paresContraditoriosCount === 1
          ? '1 par'
          : `${entry.paresContraditoriosCount} pares`

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
        <p className={`font-mono font-semibold text-sm ${colorClass}`}>
          {label}
        </p>
        <p className="text-fg-tertiary text-xs">contraditórios</p>
      </div>
    </li>
  )
}

export default async function RankingCoerenciaPage() {
  const { maisPares, menosPares } = await getRankingCoerencia(TOP_N)

  return (
    <>
      <div className="mx-auto max-w-3xl pt-8">
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Rankings', href: '/rankings' },
            { label: 'Coerência de voto' },
          ]}
        />
      </div>
      {/* P2.10 (auditoria UX 2026-07-20): header padronizado no
          HeroSection centralizado, como nas rotas core. */}
      <HeroSection
        align="center"
        description={
          'Pares de votações em que o parlamentar votou de forma oposta em proposições do mesmo tema mas com direções semânticas contrárias — por exemplo, apoiar uma lei que amplia e depois apoiar outra que restringe o mesmo direito.'
        }
        title="Coerência de voto"
        variant="plain"
      />
      <div className="mx-auto max-w-3xl pb-8">
        <p className="mb-8 text-fg-tertiary text-xs">
          Calculado sobre votações nominais com proposição vinculada e ementa
          classificável. Coerência é descritiva — não implica mérito ou acerto.
          Ver{' '}
          <Link
            className="underline hover:text-fg-secondary"
            href="/parlamentares"
          >
            perfis
          </Link>{' '}
          para o detalhe par a par.
        </p>

        <div className="space-y-8">
          <section aria-labelledby="mais-pares">
            <div className="mb-3 flex items-center gap-2">
              <GitFork className="h-4 w-4 text-red-600" aria-hidden />
              <h2
                className="font-semibold text-fg-primary text-lg"
                id="mais-pares"
              >
                Top {maisPares.length} — Mais contradições
              </h2>
            </div>
            <div className="rounded-lg border border-line-default bg-surface-base">
              {maisPares.length === 0 ? (
                <p className="px-4 py-6 text-center text-fg-tertiary text-sm">
                  Nenhum par contraditório detectado na base atual. A coluna
                  passa a listar parlamentares quando houver votos opostos em
                  proposições do mesmo tema com direções contrárias.
                </p>
              ) : (
                <ul aria-label="Parlamentares com mais pares contraditórios de voto">
                  {maisPares.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.id}
                      entry={entry}
                      rank={i + 1}
                      variant="incoerente"
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-labelledby="menos-pares">
            <div className="mb-3 flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-green-600" aria-hidden />
              <h2
                className="font-semibold text-fg-primary text-lg"
                id="menos-pares"
              >
                Top {menosPares.length} — Mais coerentes
              </h2>
            </div>
            <div className="rounded-lg border border-line-default bg-surface-base">
              {menosPares.length === 0 ? (
                <p className="px-4 py-6 text-center text-fg-tertiary text-sm">
                  Nenhum dado disponível na base atual.
                </p>
              ) : (
                <ul aria-label="Parlamentares com menos pares contraditórios de voto">
                  {menosPares.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.id}
                      entry={entry}
                      rank={i + 1}
                      variant="coerente"
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <p className="mt-8 text-fg-tertiary text-xs">
          Considera apenas proposições com ementa classificável pelo analisador
          de direção. Federações e partidos sem orientação publicada podem
          apresentar contagem subestimada. Fórmula aberta em{' '}
          <Link
            className="underline hover:text-fg-secondary"
            href="/docs/metodologia"
          >
            /docs/metodologia
          </Link>
          .
        </p>
      </div>
    </>
  )
}
