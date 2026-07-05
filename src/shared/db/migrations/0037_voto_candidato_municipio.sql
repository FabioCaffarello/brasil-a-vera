-- Sprint 14.1 (ADR-065): colégio eleitoral municipal — votos nominais por
-- município dos parlamentares vinculados (top-20 por candidatura por pleito).
-- Relação com tse_candidatura é LÓGICA via (ano_eleicao, sq_candidato), sem FK
-- física: tse-bens repõe candidaturas com DELETE+INSERT por ano (PKs regeneram
-- a cada run mensal) — mesma razão documentada para tse_bem_candidato.
CREATE TABLE "eleitoral"."voto_candidato_municipio" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ano_eleicao" integer NOT NULL,
	"sq_candidato" bigint NOT NULL,
	"municipio_tse_codigo" text NOT NULL,
	"municipio_nome" text NOT NULL,
	"uf" char(2) NOT NULL,
	"qt_votos_nominais" integer NOT NULL,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "voto_candidato_municipio_ano_sq_mun_unique" ON "eleitoral"."voto_candidato_municipio" USING btree ("ano_eleicao","sq_candidato","municipio_tse_codigo");
