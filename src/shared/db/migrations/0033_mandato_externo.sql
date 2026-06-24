-- Sprint 14.0 — G11: mandatos externos e carreira pré-mandato (Câmara)
-- Fonte: GET /deputados/{id}/mandatosExternos (TSE-verificado, não autodeclarado).
-- Câmara-only nesta versão — Senado não expõe endpoint equivalente.
-- Trust L1, cadência mensal, schema parlamentares.
-- Padrão de ingestão: DELETE-by-parlamentar_id + INSERT (substituição total).
-- anoInicio e siglaUf são nullable (cargos federais como Ministro não têm UF).

CREATE TABLE "parlamentares"."mandato_externo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parlamentar_id" uuid NOT NULL
    REFERENCES "parlamentares"."parlamentar"("id") ON DELETE CASCADE,
  -- Ex: "Prefeito(a)", "Governador(a)", "Senador(a)", "Vereador(a)", "Ministro(a)"
  "cargo" text NOT NULL,
  "sigla_uf" text,
  "municipio" text,
  "ano_inicio" integer,
  "ano_fim" integer,
  "sigla_partido_eleicao" text,
  "trust_level" "trust_level" NOT NULL DEFAULT 'L1',
  "source_url" text NOT NULL,
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "mandato_externo_parlamentar_id_idx"
  ON "parlamentares"."mandato_externo"("parlamentar_id");
