CREATE SCHEMA "votacoes";
--> statement-breakpoint
CREATE TYPE "public"."orientacao_bancada" AS ENUM('SIM', 'NAO', 'LIBERADO', 'OBSTRUCAO');--> statement-breakpoint
CREATE TYPE "public"."tipo_voto" AS ENUM('SIM', 'NAO', 'ABSTENCAO', 'AUSENTE', 'OBSTRUCAO');--> statement-breakpoint
CREATE TABLE "votacoes"."orientacao_bancada" (
	"votacao_id" uuid NOT NULL,
	"partido_sigla" text NOT NULL,
	"orientacao" "orientacao_bancada" NOT NULL,
	CONSTRAINT "orientacao_bancada_pk" PRIMARY KEY("votacao_id","partido_sigla")
);
--> statement-breakpoint
CREATE TABLE "votacoes"."votacao" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"casa" "casa" NOT NULL,
	"proposicao_id" uuid,
	"data_hora" timestamp with time zone NOT NULL,
	"descricao" text NOT NULL,
	"orgao" text NOT NULL,
	"votos_sim" integer NOT NULL,
	"votos_nao" integer NOT NULL,
	"abstencoes" integer NOT NULL,
	"ausentes" integer,
	"aprovada" boolean NOT NULL,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votacoes"."voto_nominal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"votacao_id" uuid NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	"voto" "tipo_voto" NOT NULL,
	"trust_level" "trust_level" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "votacoes"."orientacao_bancada" ADD CONSTRAINT "orientacao_bancada_votacao_id_votacao_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "votacoes"."votacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votacoes"."votacao" ADD CONSTRAINT "votacao_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "proposicoes"."proposicao"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votacoes"."voto_nominal" ADD CONSTRAINT "voto_nominal_votacao_id_votacao_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "votacoes"."votacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votacoes"."voto_nominal" ADD CONSTRAINT "voto_nominal_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "votacao_casa_source_id_unique" ON "votacoes"."votacao" USING btree ("casa","source_id");--> statement-breakpoint
CREATE INDEX "votacao_proposicao_id_idx" ON "votacoes"."votacao" USING btree ("proposicao_id");--> statement-breakpoint
CREATE INDEX "votacao_data_hora_idx" ON "votacoes"."votacao" USING btree ("data_hora");--> statement-breakpoint
CREATE UNIQUE INDEX "voto_nominal_votacao_parlamentar_unique" ON "votacoes"."voto_nominal" USING btree ("votacao_id","parlamentar_id");