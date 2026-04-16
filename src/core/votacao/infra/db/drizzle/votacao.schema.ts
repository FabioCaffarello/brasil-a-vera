import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const votacoes = pgTable('votacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  idExterno: text('id_externo').notNull().unique(),
  proposicaoIdExterno: text('proposicao_id_externo'),
  dataHora: timestamp('data_hora', { withTimezone: true }).notNull(),
  descricao: text('descricao').notNull(),
  orgao: text('orgao').notNull(),
  votosSim: integer('votos_sim').notNull().default(0),
  votosNao: integer('votos_nao').notNull().default(0),
  abstencoes: integer('abstencoes').notNull().default(0),
  ausentes: integer('ausentes').notNull().default(0),
  aprovada: boolean('aprovada').notNull(),
  trustLevel: text('trust_level').notNull().default('L1'),
  sourceUrl: text('source_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const votosNominais = pgTable('votos_nominais', {
  id: uuid('id').primaryKey().defaultRandom(),
  votacaoId: uuid('votacao_id')
    .notNull()
    .references(() => votacoes.id, { onDelete: 'cascade' }),
  parlamentarIdExterno: text('parlamentar_id_externo').notNull(),
  tipoVoto: text('tipo_voto').notNull(),
  dataHora: timestamp('data_hora', { withTimezone: true }),
})

export const orientacoesBancada = pgTable('orientacoes_bancada', {
  id: uuid('id').primaryKey().defaultRandom(),
  votacaoId: uuid('votacao_id')
    .notNull()
    .references(() => votacoes.id, { onDelete: 'cascade' }),
  partidoSigla: text('partido_sigla').notNull(),
  orientacao: text('orientacao').notNull(),
})
