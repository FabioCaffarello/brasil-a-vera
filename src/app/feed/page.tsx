import type { Metadata } from 'next'

import { nomeUfCompleto, UFS, type Uf } from '@/lib/municipios'
import { getPartidosDistintos } from '@/lib/queries/parlamentares'
import { getTemasDistintos } from '@/lib/rss/queries'

export const metadata: Metadata = {
  title: 'Feeds RSS — Brasil a Vera',
  description:
    'Inscreva-se em feeds RSS segmentados de votações: por casa, UF, partido ou tema.',
}

// Dynamic — lista partidos e temas vivos do banco. Build com placeholder
// DATABASE_URL não consegue pré-renderizar. Conteúdo muda devagar (cron
// diário de parlamentares), mas SSG aqui exigiria fallback dinâmico
// idêntico, sem ganho. Render edge a cada hit, cache implícito do CF
// Workers via Cache-Control da rota /votacoes não cobre essa rota — fica
// como follow-up se observarmos custo.
export const dynamic = 'force-dynamic'

const FEED_BASE = '/feed/votacoes'

type FeedRow = {
  label: string
  href: string
  hint?: string
}

export default async function FeedIndexPage() {
  const [partidos, temas] = await Promise.all([
    getPartidosDistintos().catch(() => [] as string[]),
    getTemasDistintos().catch(() => []),
  ])

  const ufFeeds: FeedRow[] = UFS.map((uf: Uf) => ({
    label: `${uf} — ${nomeUfCompleto(uf)}`,
    href: `${FEED_BASE}/uf/${uf}`,
  }))

  const partidoFeeds: FeedRow[] = partidos.map((sigla) => ({
    label: sigla,
    href: `${FEED_BASE}/partido/${encodeURIComponent(sigla)}`,
  }))

  const temaFeeds: FeedRow[] = temas.map((t) => ({
    label: t.nome,
    href: `${FEED_BASE}/tema/${t.codigo}`,
    hint: `${t.totalProposicoes} proposições`,
  }))

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Feeds RSS
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Inscreva-se para receber atualizações de votações nominais por
          recorte.
        </p>
      </header>

      <section className="mb-12">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          Os feeds seguem o padrão RSS 2.0. Cole a URL no seu leitor (Feedly,
          NetNewsWire, Inoreader, etc) para receber as últimas 20 votações mais
          recentes de cada recorte. Cache de 1 hora — atualização alinhada com o
          cron de ingestão de votações (4× ao dia).
        </p>
      </section>

      <FeedGroup
        title="Geral"
        feeds={[
          {
            label: 'Todas as votações',
            href: `${FEED_BASE}`,
            hint: 'Câmara + Senado consolidados',
          },
        ]}
      />

      <FeedGroup
        title="Por casa"
        feeds={[
          { label: 'Câmara dos Deputados', href: `${FEED_BASE}/casa/CAMARA` },
          { label: 'Senado Federal', href: `${FEED_BASE}/casa/SENADO` },
        ]}
      />

      <FeedGroup title="Por UF (27)" feeds={ufFeeds} columns />

      {partidoFeeds.length > 0 ? (
        <FeedGroup
          title={`Por partido (${partidoFeeds.length})`}
          feeds={partidoFeeds}
          columns
        />
      ) : null}

      {temaFeeds.length > 0 ? (
        <FeedGroup title={`Por tema (${temaFeeds.length})`} feeds={temaFeeds} />
      ) : null}
    </div>
  )
}

function FeedGroup({
  title,
  feeds,
  columns,
}: {
  title: string
  feeds: FeedRow[]
  columns?: boolean
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <ul
        className={
          columns
            ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3'
            : 'space-y-2'
        }
      >
        {feeds.map((feed) => (
          <li key={feed.href}>
            <a
              href={feed.href}
              className="block rounded-lg border border-zinc-200 bg-white p-3 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-primary-700 dark:hover:bg-primary-950"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {feed.label}
                </span>
                <span
                  aria-hidden
                  className="font-mono text-xs text-zinc-400 dark:text-zinc-500"
                >
                  RSS
                </span>
              </div>
              {feed.hint ? (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {feed.hint}
                </p>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
