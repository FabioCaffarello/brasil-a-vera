// Agregação de temas dos discursos (ADR-048). Função pura.
// As `keywords` vêm da fonte (Câmara/Senado) como string separada por vírgula —
// indexação OFICIAL, não gerada por nós (sem IA, D2). Aqui só separamos e
// contamos a frequência; determinístico.

export interface Tema {
  termo: string
  count: number
}

export function agregarTemas(
  keywordsRaw: ReadonlyArray<string | null>,
  topN: number,
): Tema[] {
  const counts = new Map<string, number>()
  for (const kw of keywordsRaw) {
    if (!kw) continue
    for (const bruto of kw.split(',')) {
      const termo = bruto.trim()
      if (termo.length === 0) continue
      counts.set(termo, (counts.get(termo) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([termo, count]) => ({ termo, count }))
    .sort((a, b) => b.count - a.count || a.termo.localeCompare(b.termo))
    .slice(0, topN)
}
