// IPCA número-índice vendorado (Eixo 2 — correção monetária, ADR-036).
//
// Fonte: IBGE/SIDRA tabela 1737, variável 2266 ("IPCA - Número-índice, base
// dez/1993 = 100"). Decisão do ADR-036: deflacionar ao nível de preços de
// **dezembro de 2022** (data-base fixa). Para cada pleito usamos o índice de
// **dezembro do ano eleitoral** (nível de preços do fim do ano da eleição) —
// deflação por razão entre dois meses, determinística:
//   V_base = V_nominal × (I_base / I_ano)
//
// Vendorado (não fetch em request-time): série pequena, determinística. Valores
// confirmados na API do SIDRA em 2026-06-16. Adicionar um pleito = uma linha
// aqui; **re-basear exige novo ADR** (imutabilidade — ADR-036 §Decisão).

export const IPCA_BASE_ANO = 2022

// ano eleitoral → IPCA número-índice de dezembro daquele ano (SIDRA 1737/2266).
export const IPCA_INDICE_DEZEMBRO: Readonly<Record<number, number>> = {
  2014: 4059.86,
  2018: 5100.61,
  2022: 6474.09,
}

const INDICE_BASE = IPCA_INDICE_DEZEMBRO[IPCA_BASE_ANO]

// Deflaciona um valor nominal de um pleito para preços de dez/IPCA_BASE_ANO.
// Retorna string "x.xx" (mesma forma do numeric mode 'string'); null se o ano
// não está na série vendorada ou o valor é inválido.
export function corrigirParaBase(
  valorNominal: string | number,
  anoEleicao: number,
): string | null {
  const indiceAno = IPCA_INDICE_DEZEMBRO[anoEleicao]
  if (indiceAno === undefined) return null
  const v =
    typeof valorNominal === 'number' ? valorNominal : Number(valorNominal)
  if (!Number.isFinite(v)) return null
  const corrigido = v * (INDICE_BASE / indiceAno)
  return (Math.round(corrigido * 100) / 100).toFixed(2)
}

// Fator de correção do pleito (p/ rótulo: "×1,59" / "+59%"). null se ausente.
export function fatorCorrecao(anoEleicao: number): number | null {
  const indiceAno = IPCA_INDICE_DEZEMBRO[anoEleicao]
  if (indiceAno === undefined) return null
  return INDICE_BASE / indiceAno
}
