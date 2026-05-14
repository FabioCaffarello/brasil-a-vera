import { sql } from "drizzle-orm";
import { boolean, index, integer, pgSchema, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { casa, orientacaoBancada, tipoVoto, trustLevel } from "./enums";
import { parlamentar } from "./parlamentares";
import { proposicao } from "./proposicoes";

export const votacoesSchema = pgSchema("votacoes");

export const votacao = votacoesSchema.table("votacao", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: text("source_id").notNull(),
  casa: casa("casa").notNull(),
  proposicaoId: uuid("proposicao_id").references(() => proposicao.id, { onDelete: "set null" }),
  dataHora: timestamp("data_hora", { withTimezone: true }).notNull(),
  descricao: text("descricao").notNull(),
  orgao: text("orgao").notNull(),
  votosSim: integer("votos_sim").notNull(),
  votosNao: integer("votos_nao").notNull(),
  abstencoes: integer("abstencoes").notNull(),
  ausentes: integer("ausentes"),
  aprovada: boolean("aprovada").notNull(),
  trustLevel: trustLevel("trust_level").notNull(),
  sourceUrl: text("source_url").notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => [
  uniqueIndex("votacao_casa_source_id_unique").on(table.casa, table.sourceId),
  index("votacao_proposicao_id_idx").on(table.proposicaoId),
  index("votacao_data_hora_idx").on(table.dataHora),
]);

export const votoNominal = votacoesSchema.table("voto_nominal", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  votacaoId: uuid("votacao_id").notNull().references(() => votacao.id, { onDelete: "cascade" }),
  parlamentarId: uuid("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
  voto: tipoVoto("voto").notNull(),
}, (table) => [
  uniqueIndex("voto_nominal_votacao_parlamentar_unique").on(table.votacaoId, table.parlamentarId),
]);

export const orientacao = votacoesSchema.table("orientacao_bancada", {
  votacaoId: uuid("votacao_id").notNull().references(() => votacao.id, { onDelete: "cascade" }),
  partidoSigla: text("partido_sigla").notNull(),
  orientacao: orientacaoBancada("orientacao").notNull(),
}, (table) => [
  primaryKey({ columns: [table.votacaoId, table.partidoSigla], name: "orientacao_bancada_pk" }),
]);
