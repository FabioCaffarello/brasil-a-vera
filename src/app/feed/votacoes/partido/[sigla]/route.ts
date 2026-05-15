import { getRssVotacoesByPartido } from '@/lib/rss/queries'
import { renderFeedResponse } from '@/lib/rss/render'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const FEED_LIMIT = 20

interface Props {
  params: Promise<{ sigla: string }>
}

// Sem validação dura contra getPartidosDistintos — siglas mudam (fusões,
// renomeações). Se sigla não existe no banco, feed retorna vazio. Aceito
// o trade-off de URLs inválidas servirem RSS válido vazio em vez de 404.
export async function GET(_req: Request, { params }: Props) {
  const { sigla: raw } = await params
  const sigla = decodeURIComponent(raw).toUpperCase()

  const siteUrl = getSiteUrl()
  const rows = await getRssVotacoesByPartido(sigla, FEED_LIMIT).catch(() => [])

  return renderFeedResponse(
    {
      title: `Brasil a Vera — Votações com participação do ${sigla}`,
      description: `Últimas votações nominais com participação de parlamentares do ${sigla}.`,
      feedUrl: `${siteUrl}/feed/votacoes/partido/${sigla}`,
      siteUrl,
    },
    rows,
    siteUrl,
  )
}
