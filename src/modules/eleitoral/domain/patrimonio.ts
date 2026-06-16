// Lógica de domínio do snapshot patrimonial (Eixo 2 — Camada A). Funções puras,
// sem IO — a query (src/lib/queries/patrimonio.ts) faz o SUM/GROUP BY no SQL e
// passa as linhas por categoria para `aggregatePatrimonio`, que calcula o total
// geral, os percentuais de composição e a ordenação.
//
// Trust (ver docs/product/EIXO-2-PATRIMONIO.md §7): os valores individuais de
// bem são L1 (bruto TSE); o TOTAL e a COMPOSIÇÃO % são agregação determinística
// = L2. O componente da seção exibe TrustBadge L2.

// Linha agregada por categoria vinda do SQL (uma por cd_tipo_bem).
export interface PatrimonioCategoriaRow {
  cdTipoBem: number
  dsTipoBem: string
  // SUM(valor_declarado) como string (numeric mode 'string' — sem float).
  total: string
  n: number
  // MAX(dt_ult_atualizacao) da categoria — "YYYY-MM-DD" ou null.
  ultDt: string | null
  sourceUrl: string
}

export interface CategoriaPatrimonio {
  cdTipoBem: number
  dsTipoBem: string
  total: string
  n: number
  // 0–100, uma casa decimal.
  pct: number
}

export interface PatrimonioSnapshot {
  anoEleicao: number
  // Total declarado, "x.xx" (string — preserva centavos).
  total: string
  nBens: number
  // Data da reedição mais recente entre os bens; "YYYY-MM-DD" ou null.
  dtUltAtualizacao: string | null
  sourceUrl: string
  // Categorias ordenadas por valor declarado (desc).
  categorias: CategoriaPatrimonio[]
}

// numeric string "1234.56" → centavos inteiros (evita erro de ponto flutuante
// ao somar; mesmo padrão de src/lib/queries/comparar.ts).
function toCents(valor: string): number {
  return Math.round(Number(valor) * 100)
}

function centsToStr(cents: number): string {
  return (cents / 100).toFixed(2)
}

// Agrega as linhas por categoria num snapshot. Retorna null quando não há bens
// (parlamentar não-vinculado ou sem declaração) — o perfil esconde a seção.
export function aggregatePatrimonio(
  rows: PatrimonioCategoriaRow[],
  anoEleicao: number,
): PatrimonioSnapshot | null {
  if (rows.length === 0) return null

  let grandCents = 0
  let nBens = 0
  let dtUltAtualizacao: string | null = null
  for (const r of rows) {
    grandCents += toCents(r.total)
    nBens += r.n
    // Datas ISO "YYYY-MM-DD" comparam lexicograficamente.
    if (r.ultDt && (dtUltAtualizacao === null || r.ultDt > dtUltAtualizacao)) {
      dtUltAtualizacao = r.ultDt
    }
  }

  const categorias: CategoriaPatrimonio[] = rows
    .map((r) => {
      const cents = toCents(r.total)
      return {
        cdTipoBem: r.cdTipoBem,
        dsTipoBem: r.dsTipoBem,
        total: centsToStr(cents),
        n: r.n,
        pct: grandCents > 0 ? Math.round((cents / grandCents) * 1000) / 10 : 0,
      }
    })
    .sort(
      (a, b) => Number(b.total) - Number(a.total) || a.cdTipoBem - b.cdTipoBem,
    )

  return {
    anoEleicao,
    total: centsToStr(grandCents),
    nBens,
    dtUltAtualizacao,
    sourceUrl: rows[0].sourceUrl,
    categorias,
  }
}
