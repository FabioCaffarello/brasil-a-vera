import type { Casa } from '@/lib/queries/votacoes'
import { getRssVotacoesByCasa } from '@/lib/rss/queries'
import { renderFeedResponse } from '@/lib/rss/render'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const FEED_LIMIT = 20

const CASA_LABEL: Record<Casa, string> = {
  CAMARA: 'Câmara dos Deputados',
  SENADO: 'Senado Federal',
}

function isCasa(value: string): value is Casa {
  return value === 'CAMARA' || value === 'SENADO'
}

interface Props {
  params: Promise<{ casa: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { casa: raw } = await params
  if (!isCasa(raw)) {
    return new Response('Casa inválida — use CAMARA ou SENADO.', {
      status: 404,
    })
  }

  const siteUrl = getSiteUrl()
  const rows = await getRssVotacoesByCasa(raw, FEED_LIMIT).catch(() => [])

  return renderFeedResponse(
    {
      title: `Brasil a Vera — Votações da ${CASA_LABEL[raw]}`,
      description: `Últimas votações nominais na ${CASA_LABEL[raw]}.`,
      feedUrl: `${siteUrl}/feed/votacoes/casa/${raw}`,
      siteUrl,
    },
    rows,
    siteUrl,
  )
}
