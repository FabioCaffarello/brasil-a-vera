// Funções puras do confronto de relatorias (ADR-044). IO isolado.

export interface DistribuicaoPartido {
  partido: string
  count: number
  /** % do total de slots de autoria, 0–100 arredondado. */
  pct: number
}

export interface DistribuicaoAutoria {
  /** Total de slots de autoria considerados (autores que mapeiam parlamentar). */
  total: number
  /** Distribuição por partido, do maior para o menor. */
  distribuicao: DistribuicaoPartido[]
}

// Agrega as siglas de partido dos autores das proposições relatadas numa
// distribuição ordenada (maior primeiro; desempate alfabético). Determinístico
// — agregação L2 sobre dados L1 (ADR-044). Sem juízo: é a distribuição factual.
export function agregarDistribuicaoAutoria(
  partidos: ReadonlyArray<string>,
): DistribuicaoAutoria {
  const total = partidos.length
  if (total === 0) return { total: 0, distribuicao: [] }

  const counts = new Map<string, number>()
  for (const p of partidos) counts.set(p, (counts.get(p) ?? 0) + 1)

  const distribuicao = [...counts.entries()]
    .map(([partido, count]) => ({
      partido,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.partido.localeCompare(b.partido))

  return { total, distribuicao }
}
