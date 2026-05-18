CREATE TABLE "parlamentares"."estatistica_parlamentar_agregada" (
	"parlamentar_id" uuid PRIMARY KEY NOT NULL,
	"pct_alinhamento" numeric(5, 2),
	"votacoes_analisadas" integer DEFAULT 0 NOT NULL,
	"proposicoes_count" integer DEFAULT 0 NOT NULL,
	"gasto_total_ano" numeric(14, 2),
	"gasto_mediana_casa" numeric(14, 2),
	"percentil_gasto_casa" numeric(5, 2),
	"trust_level" "trust_level" DEFAULT 'L2' NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parlamentares"."estatistica_parlamentar_agregada" ADD CONSTRAINT "estatistica_parlamentar_agregada_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_estat_parlamentar_alinhamento" ON "parlamentares"."estatistica_parlamentar_agregada" USING btree ("pct_alinhamento" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_estat_parlamentar_gasto" ON "parlamentares"."estatistica_parlamentar_agregada" USING btree ("gasto_total_ano" DESC NULLS LAST);