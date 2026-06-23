// Recomendações de parlamentares — Wave 10 Etapa 3.
//
// Bloco "Da sua UF — sugestões" no /painel (estados novo e maduro).
// Lista parlamentares da UF do usuário, ordenados por presença de
// agregado (parlamentares com mais dado primeiro) e excluindo os que
// o usuário já acompanha.
//
// Reusa a lista-base cacheada por UF (parlamentares-por-uf) — a mesma fonte da
// porta pública "Quem me representa" — e faz o recorte por usuário (excluir
// já-seguidos + limit) em memória. O conjunto de exclusão é pequeno (um user
// segue poucos), então filtrar ~70 linhas é grátis e evita uma chave de cache
// por usuário; ambos os fluxos compartilham a entrada quente por UF.
//
// Quando `uf` é null/undefined ou nenhum match: retorna []. UI decide
// o que mostrar (estado novo sem UF pede UF inline antes).

import {
  getParlamentaresEmExercicioPorUf,
  type ParlamentarUfRow,
} from './parlamentares-por-uf'

interface ListRecomendacoesInput {
  uf: string | null | undefined
  excludeParlamentarIds: string[]
  limit?: number
}

export async function listRecomendacoesByUf(
  input: ListRecomendacoesInput,
): Promise<ParlamentarUfRow[]> {
  if (!input.uf) return []

  const limit = input.limit ?? 4
  const exclude = new Set(input.excludeParlamentarIds)
  const base = await getParlamentaresEmExercicioPorUf(input.uf)
  return base.filter((p) => !exclude.has(p.id)).slice(0, limit)
}
