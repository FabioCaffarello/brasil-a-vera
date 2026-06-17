import type { EvolucaoPatrimonial } from './evolucao'

// Lógica de domínio da Camada C — mudança de mix de composição ao longo do
// tempo (Eixo 2). Deriva da evolução (mesma query); NÃO precisa de IPCA: o mix
// é share-of-total DENTRO de cada pleito, logo imune à inflação (deflacionar
// todos os bens de um ano pelo mesmo fator não muda as proporções). É a
// propriedade do EIXO-2 §5.C — Camada C independe do ADR-036.

export const MIX_TOP = 5

export interface MixSegmento {
  cdTipoBem: number | null // null = agregado "Outras"
  label: string
  pct: number // 0–100, 1 casa
  corIdx: number // 1..5 (top, → var(--color-chart-N)); 0 = "Outras"
}

export interface MixPleito {
  ano: number
  segmentos: MixSegmento[]
}

export interface MixComposicao {
  pleitos: MixPleito[]
  // Cores estáveis entre pleitos (mesma categoria, mesma cor → vê-se o shift).
  legenda: Array<{ label: string; corIdx: number }>
}

function toCents(v: string): number {
  return Math.round(Number(v) * 100)
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// Monta a composição % por pleito a partir da evolução. null se < 2 pleitos
// (sem dois pontos não há "mudança" de mix). Top 5 categorias por participação
// no pleito mais recente; o resto agrega em "Outras". Cor por ranking, estável
// entre pleitos.
export function buildMixComposicao(
  evolucao: EvolucaoPatrimonial | null,
): MixComposicao | null {
  if (!evolucao || evolucao.pontos.length < 2) return null
  const pontos = evolucao.pontos

  // pct por (ano → cd → {ds, pct}) a partir do NOMINAL (share intra-ano).
  const pctPorAno = new Map<number, Map<number, { ds: string; pct: number }>>()
  for (const p of pontos) {
    let totalCents = 0
    for (const c of p.categorias) totalCents += toCents(c.totalNominal)
    const m = new Map<number, { ds: string; pct: number }>()
    for (const c of p.categorias) {
      m.set(c.cdTipoBem, {
        ds: c.dsTipoBem,
        pct: totalCents > 0 ? (toCents(c.totalNominal) / totalCents) * 100 : 0,
      })
    }
    pctPorAno.set(p.ano, m)
  }

  // Ranking pela MAIOR participação em qualquer pleito (não só o último): assim
  // uma categoria que dominou um pleito antigo e encolheu também ganha cor —
  // é o que torna a MIGRAÇÃO visível (o ponto da Camada C). Rankear só pelo
  // último pleito jogaria o passado todo em "Outras".
  const cds = new Map<number, string>()
  const maxPct = new Map<number, number>()
  for (const m of pctPorAno.values()) {
    for (const [cd, v] of m) {
      cds.set(cd, v.ds)
      maxPct.set(cd, Math.max(maxPct.get(cd) ?? 0, v.pct))
    }
  }
  const ranked = [...cds.entries()].sort(
    (a, b) => (maxPct.get(b[0]) ?? 0) - (maxPct.get(a[0]) ?? 0),
  )
  const top = ranked.slice(0, MIX_TOP)
  const corDe = new Map<number, number>()
  top.forEach(([cd], i) => {
    corDe.set(cd, i + 1)
  })

  let temOutras = false
  const pleitos: MixPleito[] = pontos.map((p) => {
    const m = pctPorAno.get(p.ano) ?? new Map()
    const segmentos: MixSegmento[] = []
    let somaTop = 0
    for (const [cd, ds] of top) {
      const pct = round1(m.get(cd)?.pct ?? 0)
      somaTop += pct
      if (pct > 0) {
        segmentos.push({
          cdTipoBem: cd,
          label: ds,
          pct,
          corIdx: corDe.get(cd) ?? 0,
        })
      }
    }
    const outras = round1(Math.max(100 - somaTop, 0))
    if (outras > 0) {
      temOutras = true
      segmentos.push({
        cdTipoBem: null,
        label: 'Outras',
        pct: outras,
        corIdx: 0,
      })
    }
    return { ano: p.ano, segmentos }
  })

  const legenda = top.map(([cd, ds]) => ({
    label: ds,
    corIdx: corDe.get(cd) ?? 0,
  }))
  if (temOutras) legenda.push({ label: 'Outras', corIdx: 0 })

  return { pleitos, legenda }
}
