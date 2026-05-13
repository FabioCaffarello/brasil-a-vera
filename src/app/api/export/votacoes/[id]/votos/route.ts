import { csvResponseHeaders, toCsv } from '@/lib/csv'
import { getVotacaoById, getVotosByVotacao } from '@/lib/queries/votacoes'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const votacao = await getVotacaoById(id)
    if (!votacao) {
      return new Response('Votação não encontrada', { status: 404 })
    }

    const votos = await getVotosByVotacao(id)
    const csv = toCsv(votos, [
      { header: 'parlamentar_id', get: (v) => v.parlamentarId },
      { header: 'parlamentar_nome', get: (v) => v.parlamentarNome },
      { header: 'partido_sigla', get: (v) => v.parlamentarPartidoSigla },
      { header: 'uf', get: (v) => v.parlamentarUf },
      { header: 'voto', get: (v) => v.voto },
      { header: 'votacao_id', get: () => id },
      { header: 'votacao_data', get: () => votacao.dataHora },
      { header: 'votacao_casa', get: () => votacao.casa },
      { header: 'trust_level', get: () => 'L1' },
      { header: 'source_url', get: () => votacao.sourceUrl },
    ])

    return new Response(csv, {
      // Sem limite — total = returned, x-truncated false. Mantém shape
      // consistente com os outros exports para consumidor automatizado.
      headers: csvResponseHeaders(`votacao-${id}-votos.csv`, {
        total: votos.length,
        returned: votos.length,
      }),
    })
  } catch {
    return new Response('Erro ao gerar CSV. Tente novamente em instantes.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
}
