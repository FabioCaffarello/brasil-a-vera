import { csvResponseHeaders, toCsv } from '@/lib/csv'
import {
  countProposicoes,
  listProposicoes,
  type SituacaoProposicao,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
} from '@/lib/queries/proposicoes'

export const dynamic = 'force-dynamic'

const SITUACOES_VALIDAS: ReadonlySet<SituacaoProposicao> = new Set([
  'TRAMITANDO',
  'APROVADA',
  'REJEITADA',
  'ARQUIVADA',
  'TRANSFORMADA_EM_NORMA',
])

function normalizeTipo(value: string | null): TipoProposicao | undefined {
  if (!value) return undefined
  return TIPOS_PROPOSICAO.includes(value as TipoProposicao)
    ? (value as TipoProposicao)
    : undefined
}

function normalizeSituacao(
  value: string | null,
): SituacaoProposicao | undefined {
  if (!value) return undefined
  return SITUACOES_VALIDAS.has(value as SituacaoProposicao)
    ? (value as SituacaoProposicao)
    : undefined
}

function normalizeAno(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 1900 && n < 2100 ? n : undefined
}

function normalizeTema(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

// Limite mais alto que a página HTML (1000 vs 50) — CSV é para análise,
// não para olhar de cima. Acima de 1000, refinar filtros.
const LIMITE_EXPORT = 1000

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    // Wave 8 Sprint 8.1 PR2 — incluído `q` para que busca por ementa/numero
    // também seja exportável. PR3 — incluído `tema`. `ordem` não entra:
    // CSV é para análise; ordenação é responsabilidade da planilha do
    // destinatário.
    const filtros = {
      tipo: normalizeTipo(url.searchParams.get('tipo')),
      ano: normalizeAno(url.searchParams.get('ano')),
      situacao: normalizeSituacao(url.searchParams.get('situacao')),
      tema: normalizeTema(url.searchParams.get('tema')),
      q: url.searchParams.get('q')?.trim() || undefined,
    }

    const [page, total] = await Promise.all([
      // Wave 8 Sprint 8.1 PR5 — nova assinatura { rows, nextCursor }.
      // Export ignora nextCursor (limit alto = 1000 cobre o caso típico).
      listProposicoes(filtros, { limit: LIMITE_EXPORT }),
      countProposicoes(filtros),
    ])
    const csv = toCsv(page.rows, [
      { header: 'id', get: (r) => r.id },
      { header: 'tipo', get: (r) => r.tipo },
      { header: 'numero', get: (r) => r.numero },
      { header: 'ano', get: (r) => r.ano },
      { header: 'situacao', get: (r) => r.situacao },
      { header: 'ementa', get: (r) => r.ementa },
      { header: 'trust_level', get: () => 'L1' },
      { header: 'source_url', get: (r) => r.sourceUrl },
    ])

    return new Response(csv, {
      headers: csvResponseHeaders('proposicoes.csv', {
        total,
        returned: page.rows.length,
      }),
    })
  } catch {
    return new Response('Erro ao gerar CSV. Tente novamente em instantes.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
}
