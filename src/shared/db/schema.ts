// Schema central do Drizzle ORM.
// Cada módulo (parlamentares, votacoes, proposicoes, gastos, coerencia) exporta
// suas tabelas e este arquivo as re-exporta centralmente para o Drizzle Kit
// gerar migrations e para a instância `db` carregar o relational schema.
//
// Exemplo de uso futuro:
//   export * from '@/modules/parlamentares/schema'
//   export * from '@/modules/votacoes/schema'

export {}
