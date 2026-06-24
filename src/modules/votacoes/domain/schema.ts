import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  date,
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
    // Metadados de matéria/sessão — preenchidos só para votações do Senado
    // (ADR-042). A matéria + numeroSessao são a chave de conteúdo que casa a
    // orientação (feed `orientacaoBancada`, que não compartilha id com
    // `/votacao`) com esta votação; `codigoMateria` é o caminho limpo do
    // vínculo votação→proposição (#501). Câmara deixa null (usa proposicoesAfetadas).
    materiaSigla: text('materia_sigla'),
    materiaNumero: integer('materia_numero'),
    materiaAno: integer('materia_ano'),
    numeroSessao: integer('numero_sessao'),
    codigoMateria: integer('codigo_materia'),
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
    // Partido e UF do parlamentar no instante do voto — capturados do payload
    // da API em cada votação. Nullable: votos anteriores à migração ficam NULL.
    partidoSiglaVoto: text('partido_sigla_voto'),
    ufVoto: char('uf_voto', { length: 2 }),
  },
  (table) => [
    // Um parlamentar vota uma única vez por votação.
    uniqueIndex('voto_nominal_votacao_parlamentar_unique').on(
      table.votacaoId,
      table.parlamentarId,
    ),
    // Acesso por parlamentar_id (todos os votos de um parlamentar, sem
    // filtro de votação). O unique acima tem votacao_id como coluna líder,
    // então não serve predicados só em parlamentar_id — queries de perfil
    // (alinhamento, fidelidade, presença, comparar, votos recentes) caíam em
    // Parallel Seq Scan. EXPLAIN local (262k linhas): count por parlamentar
    // 7,4ms→0,35ms (~21×); ver PR. Espelha presenca_sessao_parlamentar_id_idx.
    index('voto_nominal_parlamentar_id_idx').on(table.parlamentarId),
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

// Sessão deliberativa de plenário (ADR-046) — fonte: API de eventos da Câmara
// (/eventos). Entidade-raiz da fonte de eventos: carrega trust/source_url.
// Câmara-only nesta fase.
export const sessao = votacoesSchema.table(
  'sessao',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // id do evento na fonte (Câmara: id de /eventos).
    sourceId: text('source_id').notNull(),
    casa: casa('casa').notNull(),
    dataHora: timestamp('data_hora', { withTimezone: true }).notNull(),
    descricao: text('descricao').notNull(),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex('sessao_casa_source_unique').on(table.casa, table.sourceId),
    index('sessao_data_hora_idx').on(table.dataHora),
  ],
)

// Presença numa sessão (ADR-046). Tabela-filha da sessão — herda trust da raiz
// (princípio 3). Substituição em massa por sessão na ingestão (princípio 5).
export const presencaSessao = votacoesSchema.table(
  'presenca_sessao',
  {
    sessaoId: uuid('sessao_id')
      .notNull()
      .references(() => sessao.id, { onDelete: 'cascade' }),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.sessaoId, table.parlamentarId],
      name: 'presenca_sessao_pk',
    }),
    index('presenca_sessao_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

// Votação nominal em comissão do Senado (ADR-057).
// Tabela separada de `votacao`: sem `aprovada` (resultado é texto livre),
// sem coluna `casa` (Senado-only), com `comissao_sigla` como identificador
// do colegiado deliberante.
export const votacaoComissaoSenado = votacoesSchema.table(
  'votacao_comissao_senado',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id').notNull(),
    comissaoSigla: text('comissao_sigla').notNull(),
    dataSessao: date('data_sessao').notNull(),
    descricao: text('descricao').notNull(),
    resultado: text('resultado'),
    // codigoMateria como text — backfill para proposicao_id em sprint futura.
    materiaSourceId: text('materia_source_id'),
    votosSim: integer('votos_sim').notNull(),
    votosNao: integer('votos_nao').notNull(),
    abstencoes: integer('abstencoes').notNull(),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex('votacao_comissao_senado_source_id_unique').on(table.sourceId),
    index('votacao_comissao_senado_comissao_sigla_idx').on(table.comissaoSigla),
    index('votacao_comissao_senado_data_sessao_idx').on(table.dataSessao),
  ],
)

// Voto nominal em comissão do Senado — filha de votacao_comissao_senado.
// `parlamentar_id` nullable: senadores fora do lookup (mandatos anteriores,
// suplências) são registrados via `senador_source_id` sem FK resolvida.
export const votoNominalComissaoSenado = votacoesSchema.table(
  'voto_nominal_comissao_senado',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    votacaoId: uuid('votacao_id')
      .notNull()
      .references(() => votacaoComissaoSenado.id, { onDelete: 'cascade' }),
    parlamentarId: uuid('parlamentar_id').references(() => parlamentar.id, {
      onDelete: 'set null',
    }),
    senadorSourceId: text('senador_source_id').notNull(),
    voto: tipoVoto('voto').notNull(),
    partidoSiglaVoto: text('partido_sigla_voto'),
    ufVoto: char('uf_voto', { length: 2 }),
  },
  (table) => [
    uniqueIndex('voto_nominal_comissao_senado_votacao_senador_unique').on(
      table.votacaoId,
      table.senadorSourceId,
    ),
    index('voto_nominal_comissao_senado_parlamentar_id_idx').on(
      table.parlamentarId,
    ),
  ],
)
