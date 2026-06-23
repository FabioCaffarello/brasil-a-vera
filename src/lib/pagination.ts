// Helpers compartilhados de paginação por cursor SSR (ADR-026) — usados pelas
// 3 listagens (parlamentares/proposições/votações). Antes, cada rota duplicava
// o build de href e o cálculo de "restantes" inline.

/**
 * Constrói o href da listagem preservando os filtros (apenas as `keys`
 * permitidas) e sobrescrevendo os params em `override` (tipicamente `after`).
 * Valores null/undefined/'' são removidos — serve tanto para o link "Mostrar
 * mais" quanto para o redirect 308 de cursor inválido (strip do `after`).
 */
export function buildListaHref(
  basePath: string,
  params: Record<string, string | undefined>,
  keys: readonly string[],
  override: Record<string, string | null | undefined> = {},
): string {
  const merged: Record<string, string | null | undefined> = {
    ...params,
    ...override,
  }
  const search = new URLSearchParams()
  for (const key of keys) {
    const value = merged[key]
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, value)
    }
  }
  const qs = search.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

/**
 * "N restantes" só faz sentido na 1ª página (sem cursor). Em páginas
 * seguintes não dá para saber quantos itens já foram vistos sem rastrear
 * page-N → retorna `null` (o botão mostra só "Mostrar mais").
 */
export function restantesPrimeiraPagina(
  temCursor: boolean,
  totalFiltrado: number,
  pageSize: number,
): number | null {
  return temCursor ? null : Math.max(0, totalFiltrado - pageSize)
}
