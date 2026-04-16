import {
  char,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const parlamentares = pgTable('parlamentares', {
  id: uuid('id').primaryKey().defaultRandom(),
  idExterno: text('id_externo').notNull().unique(),
  nome: text('nome').notNull(),
  nomeCivil: text('nome_civil'),
  cpf: text('cpf'),
  uf: char('uf', { length: 2 }).notNull(),
  partidoSigla: text('partido_sigla').notNull(),
  partidoNome: text('partido_nome').notNull(),
  urlFoto: text('url_foto'),
  casa: text('casa').notNull(),
  trustLevel: text('trust_level').notNull().default('L1'),
  sourceUrl: text('source_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const mandatos = pgTable('mandatos', {
  id: uuid('id').primaryKey().defaultRandom(),
  parlamentarId: uuid('parlamentar_id')
    .notNull()
    .references(() => parlamentares.id, { onDelete: 'cascade' }),
  legislaturaNumero: integer('legislatura_numero').notNull(),
  periodoInicio: text('periodo_inicio').notNull(),
  periodoFim: text('periodo_fim'),
  situacao: text('situacao').notNull(),
})

export const filiacoesPartidarias = pgTable('filiacoes_partidarias', {
  id: uuid('id').primaryKey().defaultRandom(),
  parlamentarId: uuid('parlamentar_id')
    .notNull()
    .references(() => parlamentares.id, { onDelete: 'cascade' }),
  partidoSigla: text('partido_sigla').notNull(),
  partidoNome: text('partido_nome').notNull(),
  periodoInicio: text('periodo_inicio').notNull(),
  periodoFim: text('periodo_fim'),
})

export const membrosComissao = pgTable('membros_comissao', {
  id: uuid('id').primaryKey().defaultRandom(),
  parlamentarId: uuid('parlamentar_id')
    .notNull()
    .references(() => parlamentares.id, { onDelete: 'cascade' }),
  comissaoId: text('comissao_id').notNull(),
  nomeComissao: text('nome_comissao').notNull(),
  tipo: text('tipo').notNull(),
  periodoInicio: text('periodo_inicio').notNull(),
  periodoFim: text('periodo_fim'),
})

export const frentesParlamentares = pgTable('frentes_parlamentares', {
  id: uuid('id').primaryKey().defaultRandom(),
  parlamentarId: uuid('parlamentar_id')
    .notNull()
    .references(() => parlamentares.id, { onDelete: 'cascade' }),
  frenteId: text('frente_id').notNull(),
  titulo: text('titulo').notNull(),
  tipo: text('tipo').notNull(),
})
