import { getRssVotacoesGlobal } from '@/lib/rss/queries'
import { renderFeedResponse } from '@/lib/rss/render'
import { getSiteUrl } from '@/lib/site-url'

// Feed RSS global de votações. force-dynamic — build do CF Workers usa
// placeholder DATABASE_URL e não consegue pré-renderizar. Cache 1h no
// header da response cobre o cenário de scrapers polling frequente.
//
// Sprint 3.2 Tarefa 2.
export const dynamic = 'force-dynamic'

const FEED_LIMIT = 20

export async function GET() {
  const siteUrl = getSiteUrl()
  const rows = await getRssVotacoesGlobal(FEED_LIMIT).catch(() => [])

  return renderFeedResponse(
    {
      title: 'Brasil a Vera — Votações',
      description:
        'Últimas votações nominais no Congresso Nacional (Câmara dos Deputados e Senado Federal).',
      feedUrl: `${siteUrl}/feed/votacoes`,
      siteUrl,
    },
    rows,
    siteUrl,
  )
}
