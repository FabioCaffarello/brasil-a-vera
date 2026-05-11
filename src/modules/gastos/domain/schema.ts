import { sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { tipoGasto, trustLevel } from '@/shared/db/enums'

// Bounded context Gastos — schema isolado no Postgres.
// Tabelas: gasto (única, agregando CEAP/verba/auxílio por parlamentar).
// Especificação em docs/domain/DATA-DICTIONARY.md#gastos.
//
// Valores monetários: numeric(15,2) com mode 'string' para evitar perda de
// precisão em conversões IEEE 754 — payments-safe.
export const gastosSchema = pgSchema('gastos')

export const gasto = gastosSchema.table(
  'gasto',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id'),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    tipo: tipoGasto('tipo').notNull(),
    categoriaCodigo: integer('categoria_codigo').notNull(),
    categoriaDescricao: text('categoria_descricao').notNull(),
    fornecedorNome: text('fornecedor_nome').notNull(),
    fornecedorCnpjCpf: text('fornecedor_cnpj_cpf'),
    valor: numeric('valor', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }).notNull(),
    valorGlosa: numeric('valor_glosa', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }),
    dataEmissao: date('data_emissao').notNull(),
    urlDocumento: text('url_documento'),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index('gasto_parlamentar_id_idx').on(table.parlamentarId),
    index('gasto_data_emissao_idx').on(table.dataEmissao),
    // Consulta comum: "gastos do dep X em 2025 por tipo"
    index('gasto_parlamentar_tipo_idx').on(table.parlamentarId, table.tipo),
  ],
)
