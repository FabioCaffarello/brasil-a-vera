import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
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
import { proposicao } from '@/modules/proposicoes/domain/schema'
import {
  casa,
  orientacaoBancada,
  tipoLideranca,
  tipoVoto,
  trustLevel,
} from '@/shared/db/enums'

// Bounded context Votacoes — schema isolado no Postgres.
// Tabelas: votacao (aggregate root), voto_nominal, orientacao_bancada.
// Especificação em docs/domain/DATA-DICTIONARY.md#votações.
//
// Nota: o campo `casa` em `votacao` estende a spec original do DATA-DICTIONARY.
// É necessário para evitar colisão de `source_id` entre Câmara e Senado —
// mesma decisão tomada na tabela `parlamentar`. TODO Wave 1+: refletir essa
// extensão no DATA-DICTIONARY.
export const votacoesSchema = pgSchema('votacoes')

export const votacao = votacoesSchema.table(
  'votacao',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id').notNull(),
    casa: casa('casa').notNull(),
    proposicaoId: uuid('proposicao_id').references(() => proposicao.id, {
      onDelete: 'set null',
    }),
    dataHora: timestamp('data_hora', { withTimezone: true }).notNull(),
    descricao: text('descricao').notNull(),
    orgao: text('orgao').notNull(),
    votosSim: integer('votos_sim').notNull(),
    votosNao: integer('votos_nao').notNull(),
    abstencoes: integer('abstencoes').notNull(),
    ausentes: integer('ausentes'),
    aprovada: boolean('aprovada').notNull(),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex('votacao_casa_source_id_unique').on(table.casa, table.sourceId),
    index('votacao_proposicao_id_idx').on(table.proposicaoId),
    index('votacao_data_hora_idx').on(table.dataHora),
  ],
)

// voto_nominal não tem `trust_level` próprio — herda da votação mãe
// (princípio 3 do CLAUDE.md: trust_level vive em aggregate roots, não
// em tabelas filhas).
export const votoNominal = votacoesSchema.table(
  'voto_nominal',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    votacaoId: uuid('votacao_id')
      .notNull()
      .references(() => votacao.id, { onDelete: 'cascade' }),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    voto: tipoVoto('voto').notNull(),
  },
  (table) => [
    // Um parlamentar vota uma única vez por votação.
    uniqueIndex('voto_nominal_votacao_parlamentar_unique').on(
      table.votacaoId,
      table.parlamentarId,
    ),
  ],
)

export const orientacao = votacoesSchema.table(
  'orientacao_bancada',
  {
    votacaoId: uuid('votacao_id')
      .notNull()
      .references(() => votacao.id, { onDelete: 'cascade' }),
    partidoSigla: text('partido_sigla').notNull(),
    orientacao: orientacaoBancada('orientacao').notNull(),
    // 'P' = orientação de partido; 'B' = bloco institucional (ADR-040).
    // Default 'P' faz backfill das linhas pré-existentes; a ingestão grava
    // 'B' explícito para Governo/Oposição/Maioria/Minoria.
    tipoLideranca: tipoLideranca('tipo_lideranca').notNull().default('P'),
  },
  (table) => [
    primaryKey({
      columns: [table.votacaoId, table.partidoSigla],
      name: 'orientacao_bancada_pk',
    }),
  ],
)
