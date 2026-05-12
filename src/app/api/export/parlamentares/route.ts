import { csvResponseHeaders, toCsv } from '@/lib/csv'
import { type Casa, listParlamentares } from '@/lib/queries/parlamentares'

export const dynamic = 'force-dynamic'

const LIMITE_EXPORT = 5000

function normalizeCasa(value: string | null): Casa | undefined {
  if (value === 'CAMARA' || value === 'SENADO') return value
  return undefined
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const filtros = {
      casa: normalizeCasa(url.searchParams.get('casa')),
      partido: url.searchParams.get('partido')?.trim() || undefined,
      uf: url.searchParams.get('uf')?.trim() || undefined,
    }

    // Defensivo: trunca para evitar dump completo do banco se um dia o universo
    // de parlamentares ingeridos crescer (múltiplas legislaturas, etc).
    const all = await listParlamentares(filtros)
    const rows = all.slice(0, LIMITE_EXPORT)

    const csv = toCsv(rows, [
      { header: 'id', get: (r) => r.id },
      { header: 'nome', get: (r) => r.nome },
      { header: 'casa', get: (r) => r.casa },
      { header: 'partido_sigla', get: (r) => r.partidoSigla },
      { header: 'uf', get: (r) => r.uf },
      { header: 'legislatura', get: (r) => r.legislatura },
      { header: 'url_foto', get: (r) => r.urlFoto },
      { header: 'trust_level', get: () => 'L1' },
      { header: 'source_url', get: (r) => r.sourceUrl },
    ])

    return new Response(csv, {
      headers: csvResponseHeaders('parlamentares.csv'),
    })
  } catch {
    return new Response('Erro ao gerar CSV. Tente novamente em instantes.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
}
