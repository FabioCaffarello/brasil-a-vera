CREATE SCHEMA "proposicoes";
--> statement-breakpoint
CREATE TYPE "public"."situacao_proposicao" AS ENUM('TRAMITANDO', 'APROVADA', 'REJEITADA', 'ARQUIVADA', 'TRANSFORMADA_EM_NORMA');--> statement-breakpoint
CREATE TYPE "public"."tipo_autoria" AS ENUM('AUTOR', 'COAUTOR');--> statement-breakpoint
CREATE TYPE "public"."tipo_proposicao" AS ENUM('PL', 'PEC', 'PLP', 'MPV', 'PDC', 'PRC');--> statement-breakpoint
CREATE TABLE "proposicoes"."proposicao" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"tipo" "tipo_proposicao" NOT NULL,
	"numero" integer NOT NULL,
	"ano" integer NOT NULL,
	"ementa" text NOT NULL,
	"ementa_detalhada" text,
	"situacao" "situacao_proposicao" NOT NULL,
	"regime" text,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposicoes"."proposicao_autor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"proposicao_id" uuid NOT NULL,
	"parlamentar_id" uuid,
	"nome" text NOT NULL,
	"tipo_autoria" "tipo_autoria" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposicoes"."proposicao_tema" (
	"proposicao_id" uuid NOT NULL,
	"codigo_tema" integer NOT NULL,
	"nome_tema" text NOT NULL,
	CONSTRAINT "proposicao_tema_pk" PRIMARY KEY("proposicao_id","codigo_tema")
);
--> statement-breakpoint
CREATE TABLE "proposicoes"."tramitacao" (
	"id" uuid PRIMARY KEY NOT NULL,
	"proposicao_id" uuid NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"orgao" text NOT NULL,
	"descricao" text NOT NULL,
	"situacao" text
);
--> statement-breakpoint
ALTER TABLE "proposicoes"."proposicao_autor" ADD CONSTRAINT "proposicao_autor_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "proposicoes"."proposicao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposicoes"."proposicao_autor" ADD CONSTRAINT "proposicao_autor_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposicoes"."proposicao_tema" ADD CONSTRAINT "proposicao_tema_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "proposicoes"."proposicao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposicoes"."tramitacao" ADD CONSTRAINT "tramitacao_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "proposicoes"."proposicao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proposicao_tipo_numero_ano_unique" ON "proposicoes"."proposicao" USING btree ("tipo","numero","ano");