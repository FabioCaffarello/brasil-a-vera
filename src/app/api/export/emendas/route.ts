import { asc, desc, eq } from 'drizzle-orm'

import { csvResponseHeaders, toCsv } from '@/lib/csv'
import { db } from '@/shared/db'
import { emendaParlamentar } from '@/shared/db/schema'

// Export CSV das emendas de um parlamentar (Sprint 14.3, ADR-066).
// Distribuição COMPLETA por emenda×localidade — a seção do perfil exibe
// top-5; o export é a via de saída para jornalista/pesquisador.
// O botão na UI é gateado por canExport() (export = autenticação); o
// endpoint permanece público por URL, como os demais /api/export/*.

export const dynamic = 'force-dynamic'

const LIMITE_EXPORT = 5000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parlamentarId = url.searchParams.get('parlamentar')?.trim() ?? ''
  if (!UUID_RE.test(parlamentarId)) {
    return new Response('Parâmetro obrigatório: ?parlamentar={uuid}', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  try {
    const all = await db
      .select()
      .from(emendaParlamentar)
      .where(eq(emendaParlamentar.parlamentarId, parlamentarId))
      .orderBy(desc(emendaParlamentar.ano), asc(emendaParlamentar.codigoEmenda))
    const rows = all.slice(0, LIMITE_EXPORT)

    const csv = toCsv(rows, [
      { header: 'ano', get: (r) => r.ano },
      { header: 'codigo_emenda', get: (r) => r.codigoEmenda },
      { header: 'tipo_emenda', get: (r) => r.tipoEmenda },
      { header: 'autor_nome', get: (r) => r.autorNome },
      { header: 'localidade', get: (r) => r.localidade },
      { header: 'municipio_ibge_codigo', get: (r) => r.municipioIbgeCodigo },
      { header: 'municipio_nome', get: (r) => r.municipioNome },
      { header: 'uf', get: (r) => r.uf },
      { header: 'valor_empenhado', get: (r) => r.valorEmpenhado },
      { header: 'valor_liquidado', get: (r) => r.valorLiquidado },
      { header: 'valor_pago', get: (r) => r.valorPago },
      { header: 'valor_rap_inscritos', get: (r) => r.valorRapInscritos },
      { header: 'valor_rap_pagos', get: (r) => r.valorRapPagos },
      { header: 'trust_level', get: (r) => r.trustLevel },
      { header: 'source_url', get: (r) => r.sourceUrl },
    ])

    return new Response(csv, {
      headers: csvResponseHeaders('emendas.csv', {
        total: all.length,
        returned: rows.length,
      }),
    })
  } catch {
    return new Response('Erro ao gerar CSV. Tente novamente em instantes.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
}
