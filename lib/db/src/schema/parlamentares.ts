import { sql } from "drizzle-orm";
import { char, date, index, integer, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { casa, situacaoMandato, tipoParticipacao, trustLevel } from "./enums";

export const parlamentaresSchema = pgSchema("parlamentares");

export const parlamentar = parlamentaresSchema.table("parlamentar", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: text("source_id").notNull(),
  nome: text("nome").notNull(),
  nomeCivil: text("nome_civil"),
  cpf: text("cpf"),
  casa: casa("casa").notNull(),
  partidoSigla: text("partido_sigla").notNull(),
  partidoNome: text("partido_nome").notNull(),
  uf: char("uf", { length: 2 }).notNull(),
  urlFoto: text("url_foto"),
  situacaoMandato: situacaoMandato("situacao_mandato").notNull(),
  legislatura: integer("legislatura").notNull(),
  trustLevel: trustLevel("trust_level").notNull(),
  sourceUrl: text("source_url").notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().default(sql`now()`),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("parlamentar_casa_source_id_unique").on(table.casa, table.sourceId),
]);

export const filiacaoPartidaria = parlamentaresSchema.table("filiacao_partidaria", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  parlamentarId: uuid("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
  partidoSigla: text("partido_sigla").notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
}, (table) => [
  index("filiacao_partidaria_parlamentar_id_idx").on(table.parlamentarId),
]);

export const membroComissao = parlamentaresSchema.table("membro_comissao", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  parlamentarId: uuid("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
  comissaoSourceId: text("comissao_source_id").notNull(),
  comissaoNome: text("comissao_nome").notNull(),
  tipoParticipacao: tipoParticipacao("tipo_participacao").notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
}, (table) => [
  uniqueIndex("membro_comissao_parlamentar_comissao_inicio_unique").on(table.parlamentarId, table.comissaoSourceId, table.dataInicio),
  index("membro_comissao_parlamentar_id_idx").on(table.parlamentarId),
]);
