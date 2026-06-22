import { sql } from 'drizzle-orm'
import {
  char,
  date,
  index,
  integer,
  numeric,
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
    // Perfil biográfico (ADR-049) — autodeclarado, Câmara-only, nullable
    // (enriquecimento via backfill, não chave). Herda trust da raiz.
    escolaridade: text('escolaridade'),
    dataNascimento: date('data_nascimento'),
    municipioNascimento: text('municipio_nascimento'),
    ufNascimento: char('uf_nascimento', { length: 2 }),
    profissao: text('profissao'),
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
    // B-tree em nome — serve ORDER BY nome (default da listagem) e ILIKE
    // prefix matches. Wave 7 Sprint 7.1 PR2. Sem pg_trgm: 513 rows cabem
    // em seq scan sub-50ms, índice é redundância barata para ordenação.
    index('parlamentar_nome_idx').on(table.nome),
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

// Tabela agregada — Wave 7 Sprint 7.0 PR1. Reduz comparações de KPI (vs.
// mediana da casa, percentil de gasto) a uma única linha por parlamentar,
// evitando materialized view (ADR-019: complexidade só com gargalo provado).
// Populada pelo script seed:agregados:parlamentar (PR2), idempotente via
// INSERT … ON CONFLICT … DO UPDATE. Consumida por KpiStrip v2 e
// ParlamentarCard v2 (Sprints 7.1/7.2).
export const estatisticaParlamentarAgregada = parlamentaresSchema.table(
  'estatistica_parlamentar_agregada',
  {
    parlamentarId: uuid('parlamentar_id')
      .primaryKey()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    pctAlinhamento: numeric('pct_alinhamento', { precision: 5, scale: 2 }),
    votacoesAnalisadas: integer('votacoes_analisadas').notNull().default(0),
    proposicoesCount: integer('proposicoes_count').notNull().default(0),
    gastoTotalAno: numeric('gasto_total_ano', { precision: 14, scale: 2 }),
    gastoMedianaCasa: numeric('gasto_mediana_casa', {
      precision: 14,
      scale: 2,
    }),
    percentilGastoCasa: numeric('percentil_gasto_casa', {
      precision: 5,
      scale: 2,
    }),
    trustLevel: trustLevel('trust_level').notNull().default('L2'),
    computedAt: timestamp('computed_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Ordenação descendente para "ranking de alinhamento" e "maior gasto".
    // NULLS LAST mantém parlamentares sem amostra fora do topo do ranking.
    index('idx_estat_parlamentar_alinhamento').on(
      sql`${table.pctAlinhamento} DESC NULLS LAST`,
    ),
    index('idx_estat_parlamentar_gasto').on(
      sql`${table.gastoTotalAno} DESC NULLS LAST`,
    ),
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
    // Sigla da comissão na origem (CCJC, CAE…). Nullable: a presença foi vista
    // em amostra por casa, não no conjunto completo — promover a NOT NULL fica
    // para depois de rodar o universo inteiro e confirmar zero exceção, senão
    // uma comissão atípica sem sigla derruba a ingestão inteira (princípio 13).
    comissaoSigla: text('comissao_sigla'),
    // Papel cru da origem (Câmara: `titulo`; Senado: `DescricaoParticipacao`).
    // O enum tipo_participacao colapsa em TITULAR/SUPLENTE; esta coluna preserva
    // o original (ex.: "Presidente", "1º Vice-Presidente") sem interpretação
    // neste incremento — dado de graça cujo descarte forçaria re-ingestão p/ o
    // confronto de diligência futuro (controle de pauta).
    cargoOrigem: text('cargo_origem'),
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
