// Ranking de presença em votações nominais de plenário — Sprint 22.0.
// Denominador: votações PLEN nominais na janela min/max de mandato do parlamentar.
// Requer >= 10 votações elegíveis (amostra mínima).
// Cache 24h — mesma cadência dos demais rankings.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { getRankingPresenca } from '@/lib/queries/rankings'

export const revalidate = 86400

export const metadata = {
  title: 'Presença em plenário — Brasil à Vera',
  description:
    'Ranking dos parlamentares com maior e menor presença em votações nominais no plenário. Calculado sobre a janela de mandato de cada parlamentar.',
}

const TOP_N = 25

interface RowProps {
  rank: number
  entry: Awaited<ReturnType<typeof getRankingPresenca>>['maisPresentes'][number]
  variant: 'presente' | 'ausente'
}

function LeaderboardRow({ rank, entry, variant }: RowProps) {
  const colorClass =
    variant === 'presente'
      ? 'text-green-700 dark:text-green-400'
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
          {entry.casa === 'CAMARA' ? 'Câmara' : 'Senado'} · {entry.presentes}/
          {entry.elegiveis} votações
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={`font-mono font-semibold text-sm ${colorClass}`}>
          {entry.pctPresenca.toFixed(1)}%
        </p>
        <p className="text-fg-tertiary text-xs">
          {variant === 'presente' ? 'presente' : 'ausente'}
        </p>
      </div>
    </li>
  )
}

export default async function RankingPresencaPage() {
  const { maisPresentes, maisAusentes } = await getRankingPresenca(TOP_N)

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Rankings', href: '/rankings' },
          { label: 'Presença em plenário' },
        ]}
      />

      <div className="mt-6 mb-2">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Presença em plenário
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Percentual de votações nominais no plenário em que o parlamentar
          registrou voto (não ausente), calculado na janela do seu mandato.
          Inclui apenas parlamentares com ao menos 10 votações elegíveis.
        </p>
      </div>

      <p className="mb-8 text-fg-tertiary text-xs">
        A Câmara infere ausência (sem linha na nominal = faltou); o Senado
        registra AUSENTE explicitamente. A fórmula é a mesma nas duas casas.
        Ausências justificadas não são distinguidas.
      </p>

      <div className="space-y-8">
        <section aria-labelledby="mais-presentes">
          <div className="mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" aria-hidden />
            <h2
              className="font-semibold text-fg-primary text-lg"
              id="mais-presentes"
            >
              Top {maisPresentes.length} — Mais presentes
            </h2>
          </div>
          <div className="rounded-lg border border-line-default bg-surface-base">
            <ul aria-label="Parlamentares com maior presença em plenário">
              {maisPresentes.map((entry, i) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  rank={i + 1}
                  variant="presente"
                />
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="mais-ausentes">
          <div className="mb-3 flex items-center gap-2">
            <UserX className="h-4 w-4 text-amber-600" aria-hidden />
            <h2
              className="font-semibold text-fg-primary text-lg"
              id="mais-ausentes"
            >
              Top {maisAusentes.length} — Mais ausentes
            </h2>
          </div>
          <div className="rounded-lg border border-line-default bg-surface-base">
            <ul aria-label="Parlamentares com maior ausência em plenário">
              {maisAusentes.map((entry, i) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  rank={i + 1}
                  variant="ausente"
                />
              ))}
            </ul>
          </div>
        </section>
      </div>

      <p className="mt-8 text-fg-tertiary text-xs">
        Presença e ausência são descrições factuais de comparecimento ao voto.
        Ausências podem ter justificativa institucional não refletida aqui.
      </p>
    </div>
  )
}
