import { sql } from "drizzle-orm";
import { date, index, integer, numeric, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tipoGasto, trustLevel } from "./enums";
import { parlamentar } from "./parlamentares";

export const gastosSchema = pgSchema("gastos");

export const gasto = gastosSchema.table("gasto", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: text("source_id"),
  parlamentarId: uuid("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
  tipo: tipoGasto("tipo").notNull(),
  categoriaCodigo: integer("categoria_codigo").notNull(),
  categoriaDescricao: text("categoria_descricao").notNull(),
  fornecedorNome: text("fornecedor_nome").notNull(),
  fornecedorCnpjCpf: text("fornecedor_cnpj_cpf"),
  valor: numeric("valor", { precision: 15, scale: 2, mode: "string" }).notNull(),
  valorGlosa: numeric("valor_glosa", { precision: 15, scale: 2, mode: "string" }),
  dataEmissao: date("data_emissao").notNull(),
  urlDocumento: text("url_documento"),
  trustLevel: trustLevel("trust_level").notNull(),
  sourceUrl: text("source_url").notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => [
  index("gasto_parlamentar_id_idx").on(table.parlamentarId),
  index("gasto_data_emissao_idx").on(table.dataEmissao),
  index("gasto_parlamentar_tipo_idx").on(table.parlamentarId, table.tipo),
  index("gasto_parlamentar_data_emissao_idx").on(table.parlamentarId, table.dataEmissao),
]);
