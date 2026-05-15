import { getRssVotacoesByTema, getTemasDistintos } from '@/lib/rss/queries'
import { renderFeedResponse } from '@/lib/rss/render'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

const FEED_LIMIT = 20

interface Props {
  params: Promise<{ codigo: string }>
}

// Tema usa código numérico (catálogo oficial da Câmara em
// /referencias/proposicoes/codTema). Mais estável que slugificar o nome —
// nome pode mudar; código não.
export async function GET(_req: Request, { params }: Props) {
  const { codigo: raw } = await params
  const codigo = Number.parseInt(raw, 10)
  if (!Number.isFinite(codigo)) {
    return new Response('Código de tema inválido — use inteiro.', {
      status: 404,
    })
  }

  const [temas, rows] = await Promise.all([
    getTemasDistintos().catch(() => []),
    getRssVotacoesByTema(codigo, FEED_LIMIT).catch(() => []),
  ])
  const tema = temas.find((t) => t.codigo === codigo)
  if (!tema) {
    return new Response('Tema não encontrado.', { status: 404 })
  }

  const siteUrl = getSiteUrl()
  return renderFeedResponse(
    {
      title: `Brasil a Vera — Votações sobre ${tema.nome}`,
      description: `Últimas votações nominais vinculadas a proposições com o tema "${tema.nome}".`,
      feedUrl: `${siteUrl}/feed/votacoes/tema/${codigo}`,
      siteUrl,
    },
    rows,
    siteUrl,
  )
}
