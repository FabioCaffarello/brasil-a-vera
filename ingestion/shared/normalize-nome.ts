// Normaliza um nome de pessoa para comparação fuzzy entre fontes heterogêneas
// (ex.: TSE NM_CANDIDATO em maiúsculas vs Senado NomeCompletoParlamentar
// em casing misto). Aplicar em ambos os lados antes do cálculo de similaridade.
export function normalizarNome(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacríticos (acentos, cedilha)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Distância de Levenshtein normalizada: 1 - (edit_distance / max(len_a, len_b)).
// Retorna [0, 1]; 1 = idênticos, 0 = sem sobreposição.
// Inline para manter zero dependências novas (81 senadores → volume trivial).
export function similaridadeNome(a: string, b: string): number {
  if (a === b) return 1
  const na = normalizarNome(a)
  const nb = normalizarNome(b)
  if (na === nb) return 1
  const la = na.length
  const lb = nb.length
  if (la === 0 || lb === 0) return 0

  // Wagner-Fischer DP, espaço O(lb)
  let prev = Array.from({ length: lb + 1 }, (_, i) => i)
  for (let i = 1; i <= la; i++) {
    const curr = [i]
    for (let j = 1; j <= lb; j++) {
      const cost = na[i - 1] === nb[j - 1] ? 0 : 1
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      )
    }
    prev = curr
  }

  const dist = prev[lb] ?? 0
  return 1 - dist / Math.max(la, lb)
}
