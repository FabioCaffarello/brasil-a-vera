// Constantes da janela quente do banco (ADR-016).
//
// O banco mantém apenas a legislatura atual e a anterior. Dados de
// legislaturas mais antigas são exportados para Cloudflare R2 (pipeline
// trimestral, ainda não implementado — issue #36).
//
// Compartilhado entre app (Worker) e ingestion (Node 22). Ambos importam
// via `@/shared/legislatura`.

export const LEGISLATURA_ATUAL = 57 as const
export const LEGISLATURA_ANTERIOR = 56 as const

export const LEGISLATURAS_QUENTES = [
  LEGISLATURA_ATUAL,
  LEGISLATURA_ANTERIOR,
] as const

// Marco temporal do início da janela quente — primeiro dia da 56ª
// legislatura. Usado para filtrar tabelas que não têm coluna `legislatura`
// direta (votacao, proposicao) por meio do campo de data.
export const DATA_INICIO_JANELA_QUENTE = new Date('2019-02-01T00:00:00Z')

// Marco temporal da legislatura atual (57ª) — datas oficiais da Câmara API
// (/legislaturas/57). Escopa a ingestão de histórico de comissão da Câmara ao
// mandato corrente; reutilizável pelo futuro filtro de mandato da feature de
// exibição (comparar Câmara leg.57 vs Senado all-time de forma justa).
export const DATA_INICIO_LEGISLATURA_ATUAL = new Date('2023-02-01T00:00:00Z')
export const DATA_FIM_LEGISLATURA_ATUAL = new Date('2027-01-31T00:00:00Z')
