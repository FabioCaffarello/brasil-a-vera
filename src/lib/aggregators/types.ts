// Tipos do agregador semanal — Wave 10 Etapa 7.2.
//
// Estrutura compartilhada entre queries (que populam) e composer
// (que serializa para markdown). Definido em arquivo separado para
// reuso em testes do composer sem trazer dependência de db.

export interface VotacaoItem {
  votacaoId: string
  descricao: string
  casa: 'CAMARA' | 'SENADO'
  dataHora: Date
  aprovada: boolean
  votosSim: number
  votosNao: number
  // Como cada parlamentar acompanhado votou nesta votação.
  porParlamentar: Array<{
    parlamentarId: string
    parlamentarNome: string
    partidoSigla: string
    voto: string
  }>
}

export interface DivergenciaItem {
  votacaoId: string
  votacaoDescricao: string
  votacaoDataHora: Date
  parlamentarId: string
  parlamentarNome: string
  partidoSigla: string
  orientacaoBancada: string
  votoIndividual: string
}

export interface ProposicaoItem {
  proposicaoId: string
  tipo: string
  numero: number
  ano: number
  ementa: string
  autorParlamentarId: string
  autorNome: string
  // Última tramitação no período (se houver) — `null` se a proposição foi
  // apenas apresentada sem movimentação subsequente.
  ultimaTramitacaoData: Date | null
  ultimaTramitacaoDescricao: string | null
}

export interface GastoItem {
  parlamentarId: string
  parlamentarNome: string
  valor: string // numeric vem como string do Drizzle/Neon
  categoriaDescricao: string
  fornecedorNome: string
  dataEmissao: Date
}

export interface Aggregate {
  votacoes?: VotacaoItem[]
  divergencias?: DivergenciaItem[]
  proposicoes?: ProposicaoItem[]
  gastos?: GastoItem[]
}

/**
 * `true` se nenhuma categoria tem itens. Wave 10 Etapa 7.2: usado pelo
 * cron para decidir entre criar delivery com status=`skipped` (LOGGED-
 * AREA-VISION §6 — "sem novidades, sem envio; agrega no próximo ciclo")
 * ou `pending` para envio na Etapa 7.3.
 */
export function isAggregateEmpty(agg: Aggregate): boolean {
  if (agg.votacoes && agg.votacoes.length > 0) return false
  if (agg.divergencias && agg.divergencias.length > 0) return false
  if (agg.proposicoes && agg.proposicoes.length > 0) return false
  if (agg.gastos && agg.gastos.length > 0) return false
  return true
}
