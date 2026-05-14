import { sql } from 'drizzle-orm'
import {
  char,
  date,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import {
  casa,
  situacaoMandato,
  tipoParticipacao,
  trustLevel,
} from '@/shared/db/enums'

// Bounded context Parlamentares — schema isolado no Postgres.
// Tabelas: parlamentar, filiacao_partidaria, membro_comissao.
// Especificação canônica em docs/domain/DATA-DICTIONARY.md#parlamentares.
export const parlamentaresSchema = pgSchema('parlamentares')

export const parlamentar = parlamentaresSchema.table(
  'parlamentar',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id').notNull(),
    nome: text('nome').notNull(),
    nomeCivil: text('nome_civil'),
    cpf: text('cpf'),
    casa: casa('casa').notNull(),
    partidoSigla: text('partido_sigla').notNull(),
    partidoNome: text('partido_nome').notNull(),
    uf: char('uf', { length: 2 }).notNull(),
    urlFoto: text('url_foto'),
    situacaoMandato: situacaoMandato('situacao_mandato').notNull(),
    legislatura: integer('legislatura').notNull(),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),
  },
  (table) => [
    // Chave natural — mesmo source_id pode coexistir entre Câmara e Senado.
    uniqueIndex('parlamentar_casa_source_id_unique').on(
      table.casa,
      table.sourceId,
    ),
  ],
)

export const filiacaoPartidaria = parlamentaresSchema.table(
  'filiacao_partidaria',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    partidoSigla: text('partido_sigla').notNull(),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
  },
  (table) => [
    // FK em parlamentar_id não é auto-indexada pelo Postgres; queries
    // "histórico de filiação do parlamentar X" são padrão.
    index('filiacao_partidaria_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

export const membroComissao = parlamentaresSchema.table(
  'membro_comissao',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    comissaoSourceId: text('comissao_source_id').notNull(),
    comissaoNome: text('comissao_nome').notNull(),
    tipoParticipacao: tipoParticipacao('tipo_participacao').notNull(),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
  },
  (table) => [
    // Uma participação por par (parlamentar, comissão, data de início).
    // Re-ingestão idempotente sem duplicar histórico.
    uniqueIndex('membro_comissao_parlamentar_comissao_inicio_unique').on(
      table.parlamentarId,
      table.comissaoSourceId,
      table.dataInicio,
    ),
    // Índice solo em parlamentar_id — redundante com o prefixo do unique
    // acima na maioria das queries, mas explicitado pra coerência com o
    // padrão de FKs indexadas nas tabelas filhas.
    index('membro_comissao_parlamentar_id_idx').on(table.parlamentarId),
  ],
)
