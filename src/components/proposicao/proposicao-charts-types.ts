// Tipos compartilhados dos charts de proposição — Wave 8 Sprint 8.4.
// Vivem em arquivo separado (sem 'use client') para poder ser importados
// tanto em Server Components (page.tsx do detalhe, que monta o adapter
// de dados) quanto pelos Client Components dos charts (que renderizam
// Recharts).

/** Wave 8 Sprint 8.4 PR2 — Chart "Apoio por partido".
 *
 * Cada item representa uma sigla agregada com a contagem de parlamentares
 * autores (apenas `tipoAutoria='AUTOR'`, decisão #2 da rodada 2). Top 6
 * + "Outros" agregado. `nomes` é a lista compacta para o tooltip (até 5
 * + "...e N outros"). */
export interface ApoioPartidoDatum {
  /** Sigla do partido (ex: "PT", "PL", "UNIÃO") ou "Outros" para
   * agregado dos partidos além do top 6. */
  sigla: string
  /** Nome completo do partido (ex: "Partido dos Trabalhadores").
   * Vazio quando sigla = "Outros". */
  nome: string
  /** Contagem de parlamentares autores principais. */
  count: number
  /** Lista compacta de nomes para o tooltip. Até 5 entradas; o restante
   * vira "...e N outros" na UI. */
  nomes: readonly string[]
}

/** Wave 8 Sprint 8.4 PR3 — Chart "Donut de votos consolidados".
 *
 * Soma de votos por tipo agregados de todas as votações vinculadas à
 * proposição. Usado para mostrar "tendência geral" da posição da casa
 * sem substituir a lista de votações vinculadas — complementa com
 * overview visual.
 *
 * 4 categorias = Sim / Não / Abstenção / Ausente.
 *
 * **Nota sobre obstrução**: o agregado `votacao` (aggregate root) tem
 * apenas Sim/Não/Abstencoes/Ausentes — obstrução só existe no nível
 * individual de `voto_nominal.voto='OBSTRUCAO'` (Câmara). Para o donut
 * consolidado, "ausente" engloba obstrução política — caller deve
 * documentar isso no UI (P2 — honestidade do dado). */
export interface VotacoesConsolidadasData {
  /** Soma de votos SIM em todas as votações vinculadas. */
  sim: number
  /** Soma de votos NÃO. */
  nao: number
  /** Soma de abstenções. */
  abstencao: number
  /** Soma de ausentes (inclui obstrução política implicitamente; ver
   * nota sobre obstrução acima). */
  ausentes: number
  /** Para honestidade (P2): última votação destacada separadamente.
   * Null quando não há votações vinculadas. */
  ultima?: {
    sim: number
    nao: number
    abstencao: number
    ausentes: number
    /** ISO da data da última votação para legenda do donut. */
    dataHora: string
    /** Resultado (true = aprovada). */
    aprovada: boolean
    /** Descrição curta da votação. */
    descricao: string
  } | null
}
