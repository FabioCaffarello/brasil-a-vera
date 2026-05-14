import { sql } from 'drizzle-orm'
import {
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
    // Source ids por casa: preservam o rastro independente que cada
    // ingestor (Câmara/Senado) registra. `source_id`/`source_url` ainda
    // refletem o "último ingestor" — útil em diagnóstico, mas insuficiente
    // para tramitação de proposições compartilhadas (PL Câmara → Senado).
    // Issue #74 detalha o motivo.
    sourceIdCamara: text('source_id_camara'),
    sourceIdSenado: text('source_id_senado'),
    tipo: tipoProposicao('tipo').notNull(),
    numero: integer('numero').notNull(),
    ano: integer('ano').notNull(),
    ementa: text('ementa').notNull(),
    ementaDetalhada: text('ementa_detalhada'),
    situacao: situacaoProposicao('situacao').notNull(),
    regime: text('regime'),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    sourceUrlCamara: text('source_url_camara'),
    sourceUrlSenado: text('source_url_senado'),
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

export const proposicaoAutor = proposicoesSchema.table(
  'proposicao_autor',
  {
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
  },
  (table) => [
    // Uniqueness em dois caminhos mutuamente exclusivos (partial indexes):
    // - quando parlamentar_id está preenchido, ele é a chave natural.
    // - quando autor é externo (parlamentar_id NULL), o nome é a chave.
    uniqueIndex('proposicao_autor_proposicao_parlamentar_unique')
      .on(table.proposicaoId, table.parlamentarId)
      .where(sql`${table.parlamentarId} IS NOT NULL`),
    uniqueIndex('proposicao_autor_proposicao_nome_unique')
      .on(table.proposicaoId, table.nome)
      .where(sql`${table.parlamentarId} IS NULL`),
    // FKs explícitos para joins em listagens.
    index('proposicao_autor_proposicao_id_idx').on(table.proposicaoId),
    index('proposicao_autor_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

export const tramitacao = proposicoesSchema.table(
  'tramitacao',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id, { onDelete: 'cascade' }),
    data: timestamp('data', { withTimezone: true }).notNull(),
    orgao: text('orgao').notNull(),
    // Primeira frase/parágrafo, truncado para ≤200 chars no mapper.
    descricaoResumida: text('descricao_resumida').notNull(),
    // Apenas quando agrega valor sobre `descricao_resumida` (despacho longo
    // da Câmara ou descrição detalhada do Senado). NULL quando a fonte tem
    // só uma descrição curta.
    descricaoCompleta: text('descricao_completa'),
    // Situação após o evento (`descricaoSituacao` Câmara / situação Senado).
    situacaoResultante: text('situacao_resultante'),
    // Chave natural por evento na fonte:
    //   - Câmara: `sequencia` (int estável por proposição)
    //   - Senado: `informeLegislativo.id` (int globalmente único)
    // Combinado com proposicao_id, dá unicidade suficiente.
    sourceId: text('source_id').notNull(),
  },
  (table) => [
    // Chave natural: garante idempotência via INSERT ... ON CONFLICT
    // DO UPDATE (princípio 5 do CLAUDE.md).
    uniqueIndex('tramitacao_proposicao_source_unique').on(
      table.proposicaoId,
      table.sourceId,
    ),
    // Index em FK para queries "timeline da proposição X ORDER BY data".
    index('tramitacao_proposicao_id_idx').on(table.proposicaoId),
  ],
)
