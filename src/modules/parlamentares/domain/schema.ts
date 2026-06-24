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

// ADR-056: lideranças, blocos partidários e frentes parlamentares.
// Entidades de poder político quase-estáticas (ingestão mensal, trust L1).
export const liderancaCargo = parlamentaresSchema.table(
  'lideranca_cargo',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    // Vocabulário normalizado pelo mapper (texto, não enum SQL — extensível
    // sem migration ao adicionar nova fonte).
    // Valores usados: LIDER_PARTIDO | VICE_LIDER_PARTIDO | LIDER_GOVERNO |
    //   LIDER_OPOSICAO | LIDER_MINORIA | LIDER_MAIORIA | LIDER_BLOCO
    tipo: text('tipo').notNull(),
    // Sigla do partido, bloco ou posição institucional ("PT", "Governo")
    entidade: text('entidade').notNull(),
    casa: casa('casa').notNull(),
    legislatura: integer('legislatura').notNull(),
    dataInicio: date('data_inicio'),
    dataFim: date('data_fim'), // NULL = vigente
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex('lideranca_cargo_natural_key').on(
      table.parlamentarId,
      table.tipo,
      table.entidade,
      table.casa,
      table.legislatura,
    ),
    index('lideranca_cargo_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

export const blocoPartidario = parlamentaresSchema.table(
  'bloco_partidario',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id').notNull(),
    nome: text('nome').notNull(),
    casa: casa('casa').notNull(),
    legislatura: integer('legislatura').notNull(),
    // Array de siglas dos partidos-membro. Substituído integralmente a cada
    // ingestão — composição de bloco é atômica, não log de mudanças.
    partidos: text('partidos').array().notNull().default(sql`'{}'::text[]`),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex('bloco_partidario_source_id_casa_unique').on(
      table.sourceId,
      table.casa,
    ),
  ],
)

export const frenteParlamentar = parlamentaresSchema.table(
  'frente_parlamentar',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id').notNull(),
    nome: text('nome').notNull(),
    legislatura: integer('legislatura').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex('frente_parlamentar_source_id_unique').on(table.sourceId),
  ],
)

export const frenteMembro = parlamentaresSchema.table(
  'frente_membro',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    frenteId: uuid('frente_id')
      .notNull()
      .references(() => frenteParlamentar.id, { onDelete: 'cascade' }),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    // Papel do parlamentar na frente (ex.: "Presidente", "Vice-Presidente").
    titulo: text('titulo'),
  },
  (table) => [
    uniqueIndex('frente_membro_natural_key').on(
      table.frenteId,
      table.parlamentarId,
    ),
    index('frente_membro_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

// Sprint 13.0 — G10: afastamentos e licenças de senadores (ADR-058).
// Explica votos AUSENTE — senador pode estar em licença médica, exercendo
// cargo no Executivo, etc. Fonte: /senador/{id}/licencas. Trust L1, mensal.
export const afastamentoSenador = parlamentaresSchema.table(
  'afastamento_senador',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    motivoSigla: text('motivo_sigla').notNull(),
    motivoDescricao: text('motivo_descricao'),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
    trustLevel: trustLevel('trust_level').notNull().default('L1'),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('afastamento_senador_natural_key').on(
      table.parlamentarId,
      table.motivoSigla,
      table.dataInicio,
    ),
    index('afastamento_senador_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

// Sprint 14.0 — G11: carreira política pré-mandato (Câmara).
// Fonte: GET /deputados/{id}/mandatosExternos — verificado via TSE, não autodeclarado.
// Câmara-only; Senado não expõe endpoint equivalente. Trust L1, mensal.
export const mandatoExterno = parlamentaresSchema.table(
  'mandato_externo',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    cargo: text('cargo').notNull(),
    siglaUf: text('sigla_uf'),
    municipio: text('municipio'),
    anoInicio: integer('ano_inicio'),
    anoFim: integer('ano_fim'),
    siglaPartidoEleicao: text('sigla_partido_eleicao'),
    trustLevel: trustLevel('trust_level').notNull().default('L1'),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Sem unique constraint: anoInicio e siglaUf são nullable (cargo federal não
    // tem UF). Ingestão usa DELETE-by-parlamentar_id + INSERT (princípio 5).
    index('mandato_externo_parlamentar_id_idx').on(table.parlamentarId),
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
