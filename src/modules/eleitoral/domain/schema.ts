import { sql } from 'drizzle-orm'
import {
  bigint,
  char,
  date,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { trustLevel } from '@/shared/db/enums'

// Bounded context Eleitoral — schema isolado no Postgres.
// Tabelas: tse_candidatura, tse_bem_candidato.
// Fonte ÚNICA: dados abertos do TSE (bem_candidato + consulta_cand).
// Habilita o Eixo 2 — Trilha Patrimonial (docs/product/EIXO-2-PATRIMONIO.md),
// Incremento 0 (tabela raiz L1 + ponte CPF→parlamentar; Camada A).
//
// Escopo deste incremento: SOMENTE eleição 2022.
//
// Decisões de modelagem (derivadas da inspeção do CSV real do TSE 2022):
// - SEM FK física entre bem→candidatura. O CSV é L1 bruto e pode ter
//   inconsistências; uma FK rígida faria o batch inteiro falhar em uma órfã.
//   A relação é lógica via (ano_eleicao, sq_candidato); a junção da Camada A
//   é INNER JOIN, então bens órfãos simplesmente não aparecem.
// - A ÚNICA FK é candidatura.parlamentar_id → parlamentar.id: a "ponte",
//   resolvida em batch por CPF exato (L2). NULL = não-vinculado (fora da
//   Camada A). Câmara: 100%. Senado: 88,9% — 9 suplentes sem registro TSE
//   federal 2014–2022 ficam NULL (ADR-063). CPF de senadores via TSE +
//   match de nome (ADR-055); link de parlamentar_id em backfill-cpf (Sprint 39).
// - Valor: numeric(15,2) mode 'string' (igual a gastos.gasto.valor) — o CSV
//   traz vírgula decimal ("9645,00"); o mapper normaliza para "9645.00".
// - Índices de leitura (Camada A) ficam para quando a query existir, com
//   EXPLAIN ANALYZE no PR (princípio 10). Aqui só natural keys + a FK.
export const eleitoralSchema = pgSchema('eleitoral')

export const tseCandidatura = eleitoralSchema.table(
  'tse_candidatura',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    anoEleicao: integer('ano_eleicao').notNull(),
    // SQ_CANDIDATO do TSE (12 dígitos, < 2^53 → mode 'number' é seguro).
    sqCandidato: bigint('sq_candidato', { mode: 'number' }).notNull(),
    // 11 dígitos sem pontuação; null quando o TSE traz sentinela (-1/-4) ou
    // valor inválido. char(11) casa exatamente com a forma canônica gravada
    // em parlamentar.cpf pelo backfill.
    cpf: char('cpf', { length: 11 }),
    cdCargo: integer('cd_cargo').notNull(),
    dsCargo: text('ds_cargo').notNull(),
    nmCandidato: text('nm_candidato').notNull(),
    sgUf: char('sg_uf', { length: 2 }).notNull(),
    sgUe: text('sg_ue').notNull(),
    dsSituacaoCandidatura: text('ds_situacao_candidatura').notNull(),
    // Votos nominais recebidos no pleito. NULL = campo ausente no CSV do TSE
    // ou candidato sem votação nominal (ex.: substituição tardia).
    qtVotosNominais: integer('qt_votos_nominais'),
    // A ponte (L2): preenchida por CPF exato. NULL = não-vinculado.
    parlamentarId: uuid('parlamentar_id').references(() => parlamentar.id, {
      onDelete: 'set null',
    }),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Chave natural — base da idempotência (ON CONFLICT DO UPDATE).
    uniqueIndex('tse_candidatura_ano_sq_unique').on(
      table.anoEleicao,
      table.sqCandidato,
    ),
  ],
)

export const tseBemCandidato = eleitoralSchema.table(
  'tse_bem_candidato',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    anoEleicao: integer('ano_eleicao').notNull(),
    // Relação LÓGICA com tse_candidatura via (ano_eleicao, sq_candidato).
    // Sem FK física (ver nota no topo do arquivo).
    sqCandidato: bigint('sq_candidato', { mode: 'number' }).notNull(),
    nrOrdemBem: integer('nr_ordem_bem').notNull(),
    // Categoria do TSE (vocabulário controlado). Usada direto na agregação
    // por categoria da Camada A — sem re-bucketização, mantém L1.
    cdTipoBem: integer('cd_tipo_bem').notNull(),
    dsTipoBem: text('ds_tipo_bem').notNull(),
    // Texto livre — pode conter quebras de linha e CNPJ embutido (futura
    // Camada D). NÃO é chave de nada.
    dsBem: text('ds_bem').notNull(),
    valorDeclarado: numeric('valor_declarado', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }).notNull(),
    // DT_ULT_ATUAL_BEM_CANDIDATO — o TSE reedita declarações retroativamente.
    dtUltAtualizacao: date('dt_ult_atualizacao'),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Chave natural fixada no plano: ano + seq candidato + ordem do bem.
    // Também serve a junção (ano, sq) da Camada A como prefixo do índice.
    uniqueIndex('tse_bem_candidato_ano_sq_ordem_unique').on(
      table.anoEleicao,
      table.sqCandidato,
      table.nrOrdemBem,
    ),
  ],
)
