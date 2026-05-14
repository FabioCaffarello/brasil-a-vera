-- Migration 0004 — limpeza de dupes em gasto + uniques/indexes em tabelas filhas
-- Ver `docs/architecture/ADR/` (ADR-014 a criar pós-migration) para contexto.
--
-- ## Passo 1 — Cleanup de duplicatas literais em gasto
--
-- A API da Câmara retorna parcelas/linhas legítimas com mesmo codDocumento;
-- por isso NÃO adicionamos unique em (parlamentar_id, source_id). Mas
-- algumas linhas existentes são duplicatas literais (mesmo parlamentar +
-- source_id + valor + data + cnpj + categoria), provavelmente fruto de
-- race condition em re-ingestão sem tx. Diagnóstico: 51 linhas excedentes
-- em 51 grupos (cada grupo tinha 2 cópias idênticas).
--
-- Critério de duplicata literal: todos esses campos iguais. Mantém a row
-- com menor `id` (uuidv7 k-sortable = mais antiga).
WITH dupes AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY parlamentar_id, source_id, valor, data_emissao,
                 fornecedor_cnpj_cpf, categoria_codigo
    ORDER BY id
  ) AS rn
  FROM "gastos"."gasto"
  WHERE source_id IS NOT NULL
)
DELETE FROM "gastos"."gasto"
WHERE id IN (SELECT id FROM dupes WHERE rn > 1);
--> statement-breakpoint

-- ## Passo 2 — Schema diff gerado pelo drizzle-kit
CREATE INDEX "gasto_parlamentar_data_emissao_idx" ON "gastos"."gasto" USING btree ("parlamentar_id","data_emissao");--> statement-breakpoint
CREATE INDEX "filiacao_partidaria_parlamentar_id_idx" ON "parlamentares"."filiacao_partidaria" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membro_comissao_parlamentar_comissao_inicio_unique" ON "parlamentares"."membro_comissao" USING btree ("parlamentar_id","comissao_source_id","data_inicio");--> statement-breakpoint
CREATE INDEX "membro_comissao_parlamentar_id_idx" ON "parlamentares"."membro_comissao" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proposicao_autor_proposicao_parlamentar_unique" ON "proposicoes"."proposicao_autor" USING btree ("proposicao_id","parlamentar_id") WHERE "proposicoes"."proposicao_autor"."parlamentar_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "proposicao_autor_proposicao_nome_unique" ON "proposicoes"."proposicao_autor" USING btree ("proposicao_id","nome") WHERE "proposicoes"."proposicao_autor"."parlamentar_id" IS NULL;--> statement-breakpoint
CREATE INDEX "proposicao_autor_proposicao_id_idx" ON "proposicoes"."proposicao_autor" USING btree ("proposicao_id");--> statement-breakpoint
CREATE INDEX "proposicao_autor_parlamentar_id_idx" ON "proposicoes"."proposicao_autor" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE INDEX "tramitacao_proposicao_id_idx" ON "proposicoes"."tramitacao" USING btree ("proposicao_id");--> statement-breakpoint
ALTER TABLE "votacoes"."voto_nominal" DROP COLUMN "trust_level";
