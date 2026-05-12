import { csvResponseHeaders, toCsv } from '@/lib/csv'
import { type Casa, listVotacoes } from '@/lib/queries/votacoes'

export const dynamic = 'force-dynamic'

function normalizeCasa(value: string | null): Casa | undefined {
  if (value === 'CAMARA' || value === 'SENADO') return value
  return undefined
}

function normalizeResultado(
  value: string | null,
): 'aprovadas' | 'rejeitadas' | undefined {
  if (value === 'aprovadas' || value === 'rejeitadas') return value
  return undefined
}

function normalizeAno(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 1900 && n < 2100 ? n : undefined
}

const LIMITE_EXPORT = 1000

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const filtros = {
      casa: normalizeCasa(url.searchParams.get('casa')),
      ano: normalizeAno(url.searchParams.get('ano')),
      resultado: normalizeResultado(url.searchParams.get('resultado')),
      somenteNominais: url.searchParams.get('somenteNominais') === '1',
    }

    const rows = await listVotacoes(filtros, LIMITE_EXPORT)
    const csv = toCsv(rows, [
      { header: 'id', get: (r) => r.id },
      { header: 'casa', get: (r) => r.casa },
      { header: 'data_hora', get: (r) => r.dataHora },
      { header: 'orgao', get: (r) => r.orgao },
      { header: 'descricao', get: (r) => r.descricao },
      { header: 'aprovada', get: (r) => r.aprovada },
      { header: 'votos_sim', get: (r) => r.votosSim },
      { header: 'votos_nao', get: (r) => r.votosNao },
      { header: 'abstencoes', get: (r) => r.abstencoes },
      { header: 'trust_level', get: () => 'L1' },
      { header: 'source_url', get: (r) => r.sourceUrl },
    ])

    return new Response(csv, {
      headers: csvResponseHeaders('votacoes.csv'),
    })
  } catch {
    return new Response('Erro ao gerar CSV. Tente novamente em instantes.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
}
