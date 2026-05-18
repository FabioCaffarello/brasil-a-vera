CREATE TABLE "proposicoes"."estatistica_proposicao_agregada" (
	"proposicao_id" uuid PRIMARY KEY NOT NULL,
	"dias_em_tramitacao" integer DEFAULT 0 NOT NULL,
	"dias_desde_ultima_tramitacao" integer,
	"n_autores" integer DEFAULT 0 NOT NULL,
	"n_partidos_autores" integer DEFAULT 0 NOT NULL,
	"n_ufs_autores" integer DEFAULT 0 NOT NULL,
	"n_votacoes" integer DEFAULT 0 NOT NULL,
	"n_votacoes_aprovadas" integer DEFAULT 0 NOT NULL,
	"n_votacoes_rejeitadas" integer DEFAULT 0 NOT NULL,
	"n_eventos_tramitacao" integer DEFAULT 0 NOT NULL,
	"ultimo_orgao" text,
	"aprovada_em_alguma_casa" boolean DEFAULT false NOT NULL,
	"mediana_dias_tipo_referencia" integer,
	"tema_canonico_codigo" integer,
	"trust_level" "trust_level" DEFAULT 'L2' NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposicoes"."estatistica_proposicao_agregada" ADD CONSTRAINT "estatistica_proposicao_agregada_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "proposicoes"."proposicao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_estat_proposicao_dias" ON "proposicoes"."estatistica_proposicao_agregada" USING btree ("dias_em_tramitacao" DESC);--> statement-breakpoint
CREATE INDEX "idx_estat_proposicao_movimentacao" ON "proposicoes"."estatistica_proposicao_agregada" USING btree ("dias_desde_ultima_tramitacao" ASC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_estat_proposicao_tema_canonico" ON "proposicoes"."estatistica_proposicao_agregada" USING btree ("tema_canonico_codigo") WHERE "proposicoes"."estatistica_proposicao_agregada"."tema_canonico_codigo" IS NOT NULL;