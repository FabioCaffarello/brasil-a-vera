import { csvResponseHeaders, toCsv } from '@/lib/csv'
import { type Casa, listParlamentares } from '@/lib/queries/parlamentares'

export const dynamic = 'force-dynamic'

function normalizeCasa(value: string | null): Casa | undefined {
  if (value === 'CAMARA' || value === 'SENADO') return value
  return undefined
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const filtros = {
    casa: normalizeCasa(url.searchParams.get('casa')),
    partido: url.searchParams.get('partido')?.trim() || undefined,
    uf: url.searchParams.get('uf')?.trim() || undefined,
  }

  const rows = await listParlamentares(filtros)
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
}
