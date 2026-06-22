// Variação patrimonial real durante o mandato + percentil vs pares (ADR-047).
// Função pura: recebe os totais de bens por (parlamentar, pleito) e devolve,
// por parlamentar, a variação real do último par de pleitos consecutivos e o
// percentil entre pares (mesma casa, mesmo par de pleitos). IO isolado.

import { corrigirParaBase } from './ipca'

export interface BemPorPleito {
  parlamentarId: string
  casa: 'CAMARA' | 'SENADO'
  anoEleicao: number
  /** Total nominal declarado no pleito, "x.xx" (numeric mode 'string'). */
  totalNominal: string
}

export interface VariacaoPatrimonial {
  pleitoDe: number
  pleitoAte: number
  /** Patrimônio corrigido por IPCA (ADR-036) no pleito inicial/final, "x.xx". */
  realDe: string
  realAte: string
  /** Variação real absoluta (realAte − realDe), "x.xx" (pode ser negativa). */
  deltaRealAbs: string
  /** Variação % sobre o real inicial; null se base 0. */
  deltaPct: number | null
  /** % de pares (mesma casa/par de pleitos) com variação real menor; null se sozinho. */
  percentil: number | null
  /** Tamanho do grupo de pares (inclui o próprio). */
  nPares: number
}

interface Entrada extends VariacaoPatrimonial {
  parlamentarId: string
  casa: 'CAMARA' | 'SENADO'
}

export function calcularVariacaoRanking(
  rows: ReadonlyArray<BemPorPleito>,
): Map<string, VariacaoPatrimonial> {
  // Agrupa pleitos por parlamentar.
  const porParlamentar = new Map<
    string,
    {
      casa: 'CAMARA' | 'SENADO'
      pleitos: Array<{ ano: number; nominal: string }>
    }
  >()
  for (const r of rows) {
    let e = porParlamentar.get(r.parlamentarId)
    if (!e) {
      e = { casa: r.casa, pleitos: [] }
      porParlamentar.set(r.parlamentarId, e)
    }
    e.pleitos.push({ ano: r.anoEleicao, nominal: r.totalNominal })
  }

  // Variação real do ÚLTIMO par de pleitos consecutivos (≥2 pleitos).
  const entradas: Entrada[] = []
  for (const [pid, { casa, pleitos }] of porParlamentar) {
    const ordenados = [...pleitos].sort((a, b) => a.ano - b.ano)
    if (ordenados.length < 2) continue
    const de = ordenados[ordenados.length - 2]
    const ate = ordenados[ordenados.length - 1]
    if (!de || !ate) continue
    const realDe = corrigirParaBase(de.nominal, de.ano)
    const realAte = corrigirParaBase(ate.nominal, ate.ano)
    if (realDe === null || realAte === null) continue
    const de_n = Number(realDe)
    const ate_n = Number(realAte)
    const deltaAbs = ate_n - de_n
    entradas.push({
      parlamentarId: pid,
      casa,
      pleitoDe: de.ano,
      pleitoAte: ate.ano,
      realDe,
      realAte,
      deltaRealAbs: deltaAbs.toFixed(2),
      deltaPct: de_n > 0 ? Math.round((deltaAbs / de_n) * 100) : null,
      percentil: null,
      nPares: 0,
    })
  }

  // Agrupa por (casa, par de pleitos) e rankeia pelo delta real ABSOLUTO (D2).
  const grupos = new Map<string, Entrada[]>()
  for (const e of entradas) {
    const k = `${e.casa}:${e.pleitoDe}:${e.pleitoAte}`
    const g = grupos.get(k) ?? []
    g.push(e)
    grupos.set(k, g)
  }

  const result = new Map<string, VariacaoPatrimonial>()
  for (const g of grupos.values()) {
    const n = g.length
    for (const e of g) {
      const meu = Number(e.deltaRealAbs)
      const abaixo = g.filter(
        (o) => o !== e && Number(o.deltaRealAbs) < meu,
      ).length
      result.set(e.parlamentarId, {
        pleitoDe: e.pleitoDe,
        pleitoAte: e.pleitoAte,
        realDe: e.realDe,
        realAte: e.realAte,
        deltaRealAbs: e.deltaRealAbs,
        deltaPct: e.deltaPct,
        percentil: n > 1 ? Math.round((abaixo / (n - 1)) * 100) : null,
        nPares: n,
      })
    }
  }
  return result
}
