// Índice de Feeds RSS — promovido ao RDS (2ª promoção da migração
// strangler-fig, ADR-033). Consome o design system
// @fabio.caffarello/react-design-system — tokens traduzidos pela tabela
// canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Hrefs dos feeds apontam pros endpoints RSS de produção
// (/feed/votacoes/...) — são o produto da página (XML), não navegação
// interna.

import { Text } from '@fabio.caffarello/react-design-system/server'
import type { Metadata } from 'next'

import { nomeUfCompleto, UFS, type Uf } from '@/lib/municipios'
import { getPartidosDistintos } from '@/lib/queries/parlamentares'
import { getTemasDistintos } from '@/lib/rss/queries'

export const metadata: Metadata = {
  title: 'Feeds RSS — Brasil à Vera',
  description:
    'Inscreva-se em feeds RSS segmentados de votações: por casa, UF, partido ou tema.',
}

// Dynamic — lista partidos e temas vivos do banco. Build com placeholder
// DATABASE_URL não consegue pré-renderizar. Conteúdo muda devagar (cron
// diário de parlamentares), mas SSG aqui exigiria fallback dinâmico
// idêntico, sem ganho.
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
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight sm:text-4xl">
          Feeds RSS
        </h1>
        <Text variant="bodyLarge" className="mt-2 text-fg-tertiary">
          Inscreva-se para receber atualizações de votações nominais por
          recorte.
        </Text>
      </header>

      <section className="mb-12">
        <Text variant="body" className="text-fg-primary">
          Os feeds seguem o padrão RSS 2.0. Cole a URL no seu leitor (Feedly,
          NetNewsWire, Inoreader, etc) para receber as últimas 20 votações mais
          recentes de cada recorte. Cache de 1 hora — atualização alinhada com o
          cron de ingestão de votações (4× ao dia).
        </Text>
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

// h2 permanece HTML cru: 4 propriedades de typography (font-medium +
// text-sm + uppercase + tracking-wide) — mesmo caso do Section da
// piloto-1. Label e hint dos cards cabem em <Text> (≤1 override).
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
      <h2 className="mb-4 font-medium text-fg-tertiary text-sm uppercase tracking-wide">
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
              className="block rounded-lg border border-line-default bg-surface-base p-3 transition-colors duration-150 hover:border-fg-brand/60 hover:bg-fg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
              href={feed.href}
            >
              <div className="flex items-center justify-between gap-2">
                <Text as="span" variant="label" className="text-fg-primary">
                  {feed.label}
                </Text>
                <Text
                  aria-hidden
                  as="span"
                  variant="caption"
                  className="font-mono text-fg-quaternary"
                >
                  RSS
                </Text>
              </div>
              {feed.hint ? (
                <Text variant="caption" className="mt-1 text-fg-tertiary">
                  {feed.hint}
                </Text>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
