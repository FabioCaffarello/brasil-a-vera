import {
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const gastos = pgTable('gastos', {
  id: uuid('id').primaryKey().defaultRandom(),
  parlamentarIdExterno: text('parlamentar_id_externo').notNull(),
  ano: integer('ano').notNull(),
  mes: integer('mes').notNull(),
  tipoDespesa: text('tipo_despesa').notNull(),
  codDocumento: integer('cod_documento').notNull().unique(),
  tipoDocumento: text('tipo_documento').notNull(),
  dataDocumento: text('data_documento'),
  numDocumento: text('num_documento').notNull(),
  valorDocumento: real('valor_documento').notNull(),
  urlDocumento: text('url_documento').notNull(),
  nomeFornecedor: text('nome_fornecedor').notNull(),
  cnpjCpfFornecedor: text('cnpj_cpf_fornecedor').notNull(),
  valorLiquido: real('valor_liquido').notNull(),
  valorGlosa: real('valor_glosa').notNull().default(0),
  trustLevel: text('trust_level').notNull().default('L1'),
  sourceUrl: text('source_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
