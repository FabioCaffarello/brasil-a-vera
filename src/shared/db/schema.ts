// Schema central do Drizzle ORM.
// Cada bounded context exporta suas tabelas e enums; este arquivo re-exporta
// tudo para o Drizzle Kit gerar migrations e para a instância `db` carregar
// o relational schema completo.

export * from '@/modules/parlamentares/domain/schema'
export * from '@/modules/proposicoes/domain/schema'
export * from './enums'
