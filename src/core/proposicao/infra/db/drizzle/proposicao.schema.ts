import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const proposicoes = pgTable('proposicoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  idExterno: text('id_externo').notNull().unique(),
  casa: text('casa').notNull(), // 'CAMARA' | 'SENADO'
  tipo: text('tipo').notNull(),
  numero: integer('numero').notNull(),
  ano: integer('ano').notNull(),
  ementa: text('ementa').notNull(),
  ementaDetalhada: text('ementa_detalhada'),
  dataApresentacao: timestamp('data_apresentacao', { withTimezone: true }),
  autores: jsonb('autores').$type<string[]>().notNull().default([]),
  temas: jsonb('temas')
    .$type<Array<{ codigoOficial: number; nome: string }>>()
    .notNull()
    .default([]),
  situacao: text('situacao').notNull().default('DESCONHECIDA'),
  situacaoDescricao: text('situacao_descricao'),
  urlInteiroTeor: text('url_inteiro_teor'),
  trustLevel: text('trust_level').notNull().default('L1'),
  sourceUrl: text('source_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
