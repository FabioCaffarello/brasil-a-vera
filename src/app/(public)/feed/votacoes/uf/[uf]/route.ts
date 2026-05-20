import { isUf, nomeUfCompleto } from '@/lib/municipios'
import { getRssVotacoesByUf } from '@/lib/rss/queries'
import { renderFeedResponse } from '@/lib/rss/render'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const FEED_LIMIT = 20

interface Props {
  params: Promise<{ uf: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { uf: raw } = await params
  const ufUpper = raw.toUpperCase()
  if (!isUf(ufUpper)) {
    return new Response(
      'UF inválida — use sigla de 2 letras das 27 UFs do IBGE.',
      { status: 404 },
    )
  }

  const siteUrl = getSiteUrl()
  const rows = await getRssVotacoesByUf(ufUpper, FEED_LIMIT).catch(() => [])
  const nomeCompleto = nomeUfCompleto(ufUpper)

  return renderFeedResponse(
    {
      title: `Brasil a Vera — Votações com participação de ${nomeCompleto}`,
      description: `Últimas votações nominais com participação de deputados ou senadores que representam ${nomeCompleto} (${ufUpper}).`,
      feedUrl: `${siteUrl}/feed/votacoes/uf/${ufUpper}`,
      siteUrl,
    },
    rows,
    siteUrl,
  )
}
