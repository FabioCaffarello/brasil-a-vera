import { sql } from 'drizzle-orm'
import {
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  situacaoProposicao,
  tipoAutoria,
  tipoProposicao,
  trustLevel,
} from '@/shared/db/enums'

// Bounded context Proposicoes — schema isolado no Postgres.
// Tabelas: proposicao (aggregate root), proposicao_tema, proposicao_autor,
// tramitacao. Especificação em docs/domain/DATA-DICTIONARY.md#proposições.
export const proposicoesSchema = pgSchema('proposicoes')

export const proposicao = proposicoesSchema.table(
  'proposicao',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id').notNull(),
    tipo: tipoProposicao('tipo').notNull(),
    numero: integer('numero').notNull(),
    ano: integer('ano').notNull(),
    ementa: text('ementa').notNull(),
    ementaDetalhada: text('ementa_detalhada'),
    situacao: situacaoProposicao('situacao').notNull(),
    regime: text('regime'),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Chave natural: PL 1234/2025 é único.
    uniqueIndex('proposicao_tipo_numero_ano_unique').on(
      table.tipo,
      table.numero,
      table.ano,
    ),
  ],
)

export const proposicaoTema = proposicoesSchema.table(
  'proposicao_tema',
  {
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id, { onDelete: 'cascade' }),
    codigoTema: integer('codigo_tema').notNull(),
    nomeTema: text('nome_tema').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.proposicaoId, table.codigoTema],
      name: 'proposicao_tema_pk',
    }),
  ],
)

export const proposicaoAutor = proposicoesSchema.table('proposicao_autor', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  proposicaoId: uuid('proposicao_id')
    .notNull()
    .references(() => proposicao.id, { onDelete: 'cascade' }),
  // Autor pode não ser parlamentar (ex.: Comissão, Mesa, Senado Federal).
  // ON DELETE SET NULL para preservar o registro do autor caso o parlamentar
  // seja removido por algum motivo.
  parlamentarId: uuid('parlamentar_id').references(() => parlamentar.id, {
    onDelete: 'set null',
  }),
  nome: text('nome').notNull(),
  tipoAutoria: tipoAutoria('tipo_autoria').notNull(),
})

export const tramitacao = proposicoesSchema.table('tramitacao', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  proposicaoId: uuid('proposicao_id')
    .notNull()
    .references(() => proposicao.id, { onDelete: 'cascade' }),
  data: timestamp('data', { withTimezone: true }).notNull(),
  orgao: text('orgao').notNull(),
  descricao: text('descricao').notNull(),
  situacao: text('situacao'),
})
