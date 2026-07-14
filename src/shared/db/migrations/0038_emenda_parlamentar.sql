CREATE SCHEMA "orcamento";
--> statement-breakpoint
CREATE TABLE "orcamento"."emenda_parlamentar" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	"codigo_emenda" text NOT NULL,
	"ano" integer NOT NULL,
	"tipo_emenda" text NOT NULL,
	"autor_codigo" text NOT NULL,
	"autor_nome" text NOT NULL,
	"localidade" text NOT NULL,
	"municipio_ibge_codigo" text,
	"municipio_nome" text,
	"uf" char(2),
	"valor_empenhado" numeric(15, 2) NOT NULL,
	"valor_liquidado" numeric(15, 2) NOT NULL,
	"valor_pago" numeric(15, 2) NOT NULL,
	"valor_rap_inscritos" numeric(15, 2) NOT NULL,
	"valor_rap_pagos" numeric(15, 2) NOT NULL,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orcamento"."emenda_parlamentar" ADD CONSTRAINT "emenda_parlamentar_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "emenda_parlamentar_codigo_localidade_unique" ON "orcamento"."emenda_parlamentar" USING btree ("codigo_emenda","localidade");
--> statement-breakpoint
CREATE INDEX "emenda_parlamentar_parlamentar_id_idx" ON "orcamento"."emenda_parlamentar" USING btree ("parlamentar_id");
