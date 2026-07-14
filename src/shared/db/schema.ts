// Schema central do Drizzle ORM.
// Cada bounded context exporta suas tabelas e enums; este arquivo re-exporta
// tudo para o Drizzle Kit gerar migrations e para a instância `db` carregar
// o relational schema completo.

export * from '@/modules/discursos/domain/schema'
export * from '@/modules/eleitoral/domain/schema'
export * from '@/modules/gastos/domain/schema'
export * from '@/modules/orcamento/domain/schema'
export * from '@/modules/parlamentares/domain/schema'
export * from '@/modules/proposicoes/domain/schema'
export * from '@/modules/usuario/domain/schema'
export * from '@/modules/vetos/domain/schema'
export * from '@/modules/votacoes/domain/schema'
export * from './enums'
