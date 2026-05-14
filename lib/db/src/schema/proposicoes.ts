import { sql } from "drizzle-orm";
import { index, integer, pgSchema, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { situacaoProposicao, tipoAutoria, tipoProposicao, trustLevel } from "./enums";
import { parlamentar } from "./parlamentares";

export const proposicoesSchema = pgSchema("proposicoes");

export const proposicao = proposicoesSchema.table("proposicao", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: text("source_id").notNull(),
  sourceIdCamara: text("source_id_camara"),
  sourceIdSenado: text("source_id_senado"),
  tipo: tipoProposicao("tipo").notNull(),
  numero: integer("numero").notNull(),
  ano: integer("ano").notNull(),
  ementa: text("ementa").notNull(),
  ementaDetalhada: text("ementa_detalhada"),
  situacao: situacaoProposicao("situacao").notNull(),
  regime: text("regime"),
  trustLevel: trustLevel("trust_level").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceUrlCamara: text("source_url_camara"),
  sourceUrlSenado: text("source_url_senado"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("proposicao_tipo_numero_ano_unique").on(table.tipo, table.numero, table.ano),
]);

export const proposicaoTema = proposicoesSchema.table("proposicao_tema", {
  proposicaoId: uuid("proposicao_id").notNull().references(() => proposicao.id, { onDelete: "cascade" }),
  codigoTema: integer("codigo_tema").notNull(),
  nomeTema: text("nome_tema").notNull(),
}, (table) => [
  primaryKey({ columns: [table.proposicaoId, table.codigoTema], name: "proposicao_tema_pk" }),
]);

export const proposicaoAutor = proposicoesSchema.table("proposicao_autor", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  proposicaoId: uuid("proposicao_id").notNull().references(() => proposicao.id, { onDelete: "cascade" }),
  parlamentarId: uuid("parlamentar_id").references(() => parlamentar.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  tipoAutoria: tipoAutoria("tipo_autoria").notNull(),
}, (table) => [
  uniqueIndex("proposicao_autor_proposicao_parlamentar_unique").on(table.proposicaoId, table.parlamentarId).where(sql`${table.parlamentarId} IS NOT NULL`),
  uniqueIndex("proposicao_autor_proposicao_nome_unique").on(table.proposicaoId, table.nome).where(sql`${table.parlamentarId} IS NULL`),
  index("proposicao_autor_proposicao_id_idx").on(table.proposicaoId),
  index("proposicao_autor_parlamentar_id_idx").on(table.parlamentarId),
]);

export const tramitacao = proposicoesSchema.table("tramitacao", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  proposicaoId: uuid("proposicao_id").notNull().references(() => proposicao.id, { onDelete: "cascade" }),
  data: timestamp("data", { withTimezone: true }).notNull(),
  orgao: text("orgao").notNull(),
  descricaoResumida: text("descricao_resumida").notNull(),
  descricaoCompleta: text("descricao_completa"),
  situacaoResultante: text("situacao_resultante"),
  sourceId: text("source_id").notNull(),
}, (table) => [
  uniqueIndex("tramitacao_proposicao_source_unique").on(table.proposicaoId, table.sourceId),
  index("tramitacao_proposicao_id_idx").on(table.proposicaoId),
]);
