CREATE SCHEMA "eleitoral";
--> statement-breakpoint
CREATE TABLE "eleitoral"."tse_bem_candidato" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ano_eleicao" integer NOT NULL,
	"sq_candidato" bigint NOT NULL,
	"nr_ordem_bem" integer NOT NULL,
	"cd_tipo_bem" integer NOT NULL,
	"ds_tipo_bem" text NOT NULL,
	"ds_bem" text NOT NULL,
	"valor_declarado" numeric(15, 2) NOT NULL,
	"dt_ult_atualizacao" date,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eleitoral"."tse_candidatura" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ano_eleicao" integer NOT NULL,
	"sq_candidato" bigint NOT NULL,
	"cpf" char(11),
	"cd_cargo" integer NOT NULL,
	"ds_cargo" text NOT NULL,
	"nm_candidato" text NOT NULL,
	"sg_uf" char(2) NOT NULL,
	"sg_ue" text NOT NULL,
	"ds_situacao_candidatura" text NOT NULL,
	"parlamentar_id" uuid,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eleitoral"."tse_candidatura" ADD CONSTRAINT "tse_candidatura_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tse_bem_candidato_ano_sq_ordem_unique" ON "eleitoral"."tse_bem_candidato" USING btree ("ano_eleicao","sq_candidato","nr_ordem_bem");--> statement-breakpoint
CREATE UNIQUE INDEX "tse_candidatura_ano_sq_unique" ON "eleitoral"."tse_candidatura" USING btree ("ano_eleicao","sq_candidato");