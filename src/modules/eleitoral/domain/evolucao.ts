import { corrigirParaBase, IPCA_BASE_ANO } from './ipca'

// Lógica de domínio da Camada B — evolução patrimonial entre pleitos (Eixo 2).
// Função pura: a query agrupa por (ano, categoria) no SQL e passa as linhas
// aqui, que montam os pontos discretos por pleito + os deltas.
//
// Invariantes (docs/product/EIXO-2-PATRIMONIO.md):
// - Pontos DISCRETOS por pleito; deltas SÓ entre pleitos consecutivos que
//   EXISTEM. Lacuna entre pleitos ≠ zero — nunca interpolamos nem assumimos.
// - Valores corrigidos por IPCA para a data-base (dez/2022, ADR-036); o nominal
//   é mantido como substrato. Trust: L2 (agregação determinística + índice
//   oficial). A composição/total individuais herdam L1 nos itens.

export interface CategoriaPleito {
  cdTipoBem: number
  dsTipoBem: string
  totalNominal: string
  totalCorrigido: string
}

export interface PleitoPonto {
  ano: number
  totalNominal: string
  totalCorrigido: string
  nBens: number
  categorias: CategoriaPleito[]
}

export interface DeltaPleito {
  de: number
  para: number
  // Variação do total CORRIGIDO entre os dois pleitos (string assinada "x.xx").
  deltaCorrigido: string
  // Variação percentual sobre o corrigido do pleito anterior; null se base 0.
  deltaPct: number | null
}

export interface EvolucaoPatrimonial {
  baseAno: number
  pontos: PleitoPonto[]
  deltas: DeltaPleito[]
}

// Linha agregada por (ano, categoria) vinda do SQL.
export interface EvolucaoRow {
  anoEleicao: number
  cdTipoBem: number
  dsTipoBem: string
  total: string
  n: number
}

function toCents(valor: string): number {
  return Math.round(Number(valor) * 100)
}
function centsToStr(cents: number): string {
  return (cents / 100).toFixed(2)
}

// Corrige um total nominal (string) para a base. A cobertura da série IPCA
// (ipca.ts) é garantida pelo escopo da ingestão — todos os anos ingeridos têm
// índice. O fallback ao nominal é defensivo e não deve ocorrer em produção.
function corrigir(totalNominal: string, ano: number): string {
  return corrigirParaBase(totalNominal, ano) ?? totalNominal
}

// Monta a evolução. Retorna null se houver menos de 2 pleitos — sem 2 pontos
// não há evolução (o snapshot de 1 pleito é a Camada A).
export function buildEvolucao(
  rows: EvolucaoRow[],
  baseAno: number = IPCA_BASE_ANO,
): EvolucaoPatrimonial | null {
  if (rows.length === 0) return null

  // Agrupa por ano → categorias (cents) + contagem.
  const porAno = new Map<
    number,
    { cats: Map<number, { ds: string; cents: number }>; nBens: number }
  >()
  for (const r of rows) {
    let ano = porAno.get(r.anoEleicao)
    if (!ano) {
      ano = { cats: new Map(), nBens: 0 }
      porAno.set(r.anoEleicao, ano)
    }
    ano.cats.set(r.cdTipoBem, {
      ds: r.dsTipoBem,
      cents: (ano.cats.get(r.cdTipoBem)?.cents ?? 0) + toCents(r.total),
    })
    ano.nBens += r.n
  }

  const pontos: PleitoPonto[] = [...porAno.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ano, dados]) => {
      let totalCents = 0
      const categorias: CategoriaPleito[] = [...dados.cats.entries()]
        .map(([cd, c]) => {
          totalCents += c.cents
          const nominal = centsToStr(c.cents)
          return {
            cdTipoBem: cd,
            dsTipoBem: c.ds,
            totalNominal: nominal,
            totalCorrigido: corrigir(nominal, ano),
          }
        })
        .sort((a, b) => Number(b.totalNominal) - Number(a.totalNominal))
      const totalNominal = centsToStr(totalCents)
      return {
        ano,
        totalNominal,
        totalCorrigido: corrigir(totalNominal, ano),
        nBens: dados.nBens,
        categorias,
      }
    })

  if (pontos.length < 2) return null

  const deltas: DeltaPleito[] = []
  for (let i = 1; i < pontos.length; i++) {
    const de = pontos[i - 1]
    const para = pontos[i]
    const deCents = toCents(de.totalCorrigido)
    const paraCents = toCents(para.totalCorrigido)
    deltas.push({
      de: de.ano,
      para: para.ano,
      deltaCorrigido: centsToStr(paraCents - deCents),
      deltaPct:
        deCents > 0
          ? Math.round(((paraCents - deCents) / deCents) * 1000) / 10
          : null,
    })
  }

  return { baseAno, pontos, deltas }
}
