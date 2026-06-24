-- Sprint 12.1 — Estruturas de poder político
-- ADR-056: lideranças, blocos partidários e frentes parlamentares
-- Trust L1, cadência mensal, schema parlamentares

CREATE TABLE "parlamentares"."lideranca_cargo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parlamentar_id" uuid NOT NULL REFERENCES "parlamentares"."parlamentar"("id") ON DELETE CASCADE,
  "tipo" text NOT NULL,
  "entidade" text NOT NULL,
  "casa" "casa" NOT NULL,
  "legislatura" integer NOT NULL,
  "data_inicio" date,
  "data_fim" date,
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lideranca_cargo_natural_key"
  ON "parlamentares"."lideranca_cargo"("parlamentar_id", "tipo", "entidade", "casa", "legislatura");
--> statement-breakpoint
CREATE INDEX "lideranca_cargo_parlamentar_id_idx"
  ON "parlamentares"."lideranca_cargo"("parlamentar_id");
--> statement-breakpoint

CREATE TABLE "parlamentares"."bloco_partidario" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" text NOT NULL,
  "nome" text NOT NULL,
  "casa" "casa" NOT NULL,
  "legislatura" integer NOT NULL,
  "partidos" text[] NOT NULL DEFAULT '{}',
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bloco_partidario_source_id_casa_unique"
  ON "parlamentares"."bloco_partidario"("source_id", "casa");
--> statement-breakpoint

CREATE TABLE "parlamentares"."frente_parlamentar" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" text NOT NULL,
  "nome" text NOT NULL,
  "legislatura" integer NOT NULL,
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "frente_parlamentar_source_id_unique"
  ON "parlamentares"."frente_parlamentar"("source_id");
--> statement-breakpoint

CREATE TABLE "parlamentares"."frente_membro" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "frente_id" uuid NOT NULL REFERENCES "parlamentares"."frente_parlamentar"("id") ON DELETE CASCADE,
  "parlamentar_id" uuid NOT NULL REFERENCES "parlamentares"."parlamentar"("id") ON DELETE CASCADE,
  "titulo" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "frente_membro_natural_key"
  ON "parlamentares"."frente_membro"("frente_id", "parlamentar_id");
--> statement-breakpoint
CREATE INDEX "frente_membro_parlamentar_id_idx"
  ON "parlamentares"."frente_membro"("parlamentar_id");
