import { sql } from 'drizzle-orm'
import {
  char,
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

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { trustLevel } from '@/shared/db/enums'

// Bounded context Orçamento — schema isolado no Postgres (ADR-013).
// Tabelas: emenda_parlamentar.
// Fonte: bulk download do Portal da Transparência (CGU), sem token (ADR-066).
// Distinto do contexto `gastos` (CEAP = despesa do mandato, fonte Câmara):
// emenda orçamentária é destinação de orçamento autorada pelo parlamentar.
//
// Decisões de modelagem (derivadas da inspeção do CSV real, 2026-07-14):
// - Granularidade: agregado por (codigo_emenda, localidade). O CSV é por
//   emenda × classificação orçamentária × localidade; o produto consome
//   totais e top-municípios, não o detalhe de plano orçamentário.
// - `localidade` é o texto verbatim da fonte ("CAMAMU - BA", "MÚLTIPLO",
//   "Nacional", "SÃO PAULO (UF)"). 62% das linhas individuais não têm
//   município específico — municipio_* são NULL nesses casos e a UI
//   reporta o bucket "sem município específico" com honestidade.
// - FK forte para parlamentar (notNull + cascade): só persistimos emendas
//   individuais com autor vinculado (ADR-066 D3) — linha sem vínculo nunca
//   entra, então a FK nunca é órfã (padrão gastos.gasto).
// - Valores: numeric(15,2) mode 'string' (padrão gastos/eleitoral) — o CSV
//   traz vírgula decimal ("394200,00"); o mapper normaliza para "394200.00".
// - Idempotência: snapshot completo da fonte → DELETE integral + INSERT em
//   transação (restos a pagar mudam retroativamente em anos antigos).
//   O uniqueIndex da chave natural é a rede de segurança.
// - Índices de leitura extras ficam para quando houver EXPLAIN ANALYZE no
//   PR (princípio 10). Aqui só a chave natural + a FK (padrão gastos).
export const orcamentoSchema = pgSchema('orcamento')

export const emendaParlamentar = orcamentoSchema.table(
  'emenda_parlamentar',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    // Código da Emenda da fonte (ano + código do autor + número).
    codigoEmenda: text('codigo_emenda').notNull(),
    ano: integer('ano').notNull(),
    tipoEmenda: text('tipo_emenda').notNull(),
    // Código/nome do autor verbatim da fonte — preserva o dado bruto que
    // sustentou o vínculo (auditabilidade do match por nome, ADR-066 D3).
    autorCodigo: text('autor_codigo').notNull(),
    autorNome: text('autor_nome').notNull(),
    localidade: text('localidade').notNull(),
    // Código IBGE do município de destino; NULL quando a localidade é
    // múltipla, estadual ou nacional. Sem zeros removidos: IBGE é 7 dígitos
    // estáveis (diferente do código TSE — ponte TSE↔IBGE fica p/ o confronto).
    municipioIbgeCodigo: text('municipio_ibge_codigo'),
    municipioNome: text('municipio_nome'),
    // Sigla derivada deterministicamente do Código UF IBGE (2 primeiros
    // dígitos); NULL quando a fonte não informa.
    uf: char('uf', { length: 2 }),
    valorEmpenhado: numeric('valor_empenhado', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }).notNull(),
    valorLiquidado: numeric('valor_liquidado', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }).notNull(),
    valorPago: numeric('valor_pago', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }).notNull(),
    valorRapInscritos: numeric('valor_rap_inscritos', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }).notNull(),
    valorRapPagos: numeric('valor_rap_pagos', {
      precision: 15,
      scale: 2,
      mode: 'string',
    }).notNull(),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Chave natural — rede de segurança da idempotência (DELETE-all + INSERT).
    uniqueIndex('emenda_parlamentar_codigo_localidade_unique').on(
      table.codigoEmenda,
      table.localidade,
    ),
    // FK consultada pela query do perfil (padrão gasto_parlamentar_id_idx).
    index('emenda_parlamentar_parlamentar_id_idx').on(table.parlamentarId),
  ],
)
