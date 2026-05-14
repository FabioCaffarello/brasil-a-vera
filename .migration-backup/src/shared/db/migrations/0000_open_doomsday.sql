CREATE SCHEMA "parlamentares";
--> statement-breakpoint
CREATE TYPE "public"."casa" AS ENUM('CAMARA', 'SENADO');--> statement-breakpoint
CREATE TYPE "public"."situacao_mandato" AS ENUM('EXERCICIO', 'AFASTADO', 'SUPLENCIA', 'LICENCA');--> statement-breakpoint
CREATE TYPE "public"."tipo_participacao" AS ENUM('TITULAR', 'SUPLENTE');--> statement-breakpoint
CREATE TYPE "public"."trust_level" AS ENUM('L1', 'L2', 'L3', 'L4');--> statement-breakpoint
CREATE TABLE "parlamentares"."filiacao_partidaria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	"partido_sigla" text NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date
);
--> statement-breakpoint
CREATE TABLE "parlamentares"."membro_comissao" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	"comissao_source_id" text NOT NULL,
	"comissao_nome" text NOT NULL,
	"tipo_participacao" "tipo_participacao" NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date
);
--> statement-breakpoint
CREATE TABLE "parlamentares"."parlamentar" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"nome" text NOT NULL,
	"nome_civil" text,
	"cpf" text,
	"casa" "casa" NOT NULL,
	"partido_sigla" text NOT NULL,
	"partido_nome" text NOT NULL,
	"uf" char(2) NOT NULL,
	"url_foto" text,
	"situacao_mandato" "situacao_mandato" NOT NULL,
	"legislatura" integer NOT NULL,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "parlamentares"."filiacao_partidaria" ADD CONSTRAINT "filiacao_partidaria_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parlamentares"."membro_comissao" ADD CONSTRAINT "membro_comissao_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parlamentar_casa_source_id_unique" ON "parlamentares"."parlamentar" USING btree ("casa","source_id");