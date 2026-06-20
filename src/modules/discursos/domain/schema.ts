import { sql } from 'drizzle-orm'
import { index, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { casa, trustLevel } from '@/shared/db/enums'

// Bounded context Discursos — schema isolado no Postgres (ADR-013).
// Tabela: discurso (aggregate root). Fonte: /deputados/{id}/discursos (Câmara)
// e /senador/{codigo}/discursos (Senado).
//
// ADR-016 / princípio 11: NÃO armazenamos o texto integral (a transcrição da
// Câmara vem inline e longa; o Senado expõe por URL). Guardamos só metadados +
// resumo curto + `url_texto` (Senado) — o inteiro teor fica fora do Neon.
export const discursosSchema = pgSchema('discursos')

export const discurso = discursosSchema.table(
  'discurso',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    casa: casa('casa').notNull(),
    // Senado: CodigoPronunciamento. Câmara: a API não dá id nativo →
    // sintetizado (sourceId pode ser null se não houver chave estável).
    sourceId: text('source_id'),
    data: timestamp('data', { withTimezone: true }).notNull(),
    tipo: text('tipo').notNull(),
    sumario: text('sumario'),
    keywords: text('keywords'),
    // URL do inteiro teor (Senado). Câmara não expõe URL estável → null.
    urlTexto: text('url_texto'),
    trustLevel: trustLevel('trust_level').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // "discursos do parlamentar X" é o padrão de consulta; FK não é
    // auto-indexada no Postgres.
    index('discurso_parlamentar_id_idx').on(table.parlamentarId),
  ],
)
