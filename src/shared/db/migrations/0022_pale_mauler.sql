CREATE TABLE "proposicoes"."relatoria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"proposicao_id" uuid NOT NULL,
	"parlamentar_id" uuid,
	"relator_source_id" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposicoes"."relatoria" ADD CONSTRAINT "relatoria_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "proposicoes"."proposicao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposicoes"."relatoria" ADD CONSTRAINT "relatoria_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "relatoria_proposicao_unique" ON "proposicoes"."relatoria" USING btree ("proposicao_id");--> statement-breakpoint
CREATE INDEX "relatoria_parlamentar_id_idx" ON "proposicoes"."relatoria" USING btree ("parlamentar_id");