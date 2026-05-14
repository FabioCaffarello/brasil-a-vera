CREATE SCHEMA "gastos";
--> statement-breakpoint
CREATE TYPE "public"."tipo_gasto" AS ENUM('CEAP', 'VERBA_GABINETE', 'AUXILIO_MORADIA');--> statement-breakpoint
CREATE TABLE "gastos"."gasto" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" text,
	"parlamentar_id" uuid NOT NULL,
	"tipo" "tipo_gasto" NOT NULL,
	"categoria_codigo" integer NOT NULL,
	"categoria_descricao" text NOT NULL,
	"fornecedor_nome" text NOT NULL,
	"fornecedor_cnpj_cpf" text,
	"valor" numeric(15, 2) NOT NULL,
	"valor_glosa" numeric(15, 2),
	"data_emissao" date NOT NULL,
	"url_documento" text,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gastos"."gasto" ADD CONSTRAINT "gasto_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gasto_parlamentar_id_idx" ON "gastos"."gasto" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE INDEX "gasto_data_emissao_idx" ON "gastos"."gasto" USING btree ("data_emissao");--> statement-breakpoint
CREATE INDEX "gasto_parlamentar_tipo_idx" ON "gastos"."gasto" USING btree ("parlamentar_id","tipo");