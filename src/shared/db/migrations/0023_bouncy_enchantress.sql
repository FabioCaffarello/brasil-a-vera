DROP INDEX "proposicoes"."relatoria_proposicao_unique";--> statement-breakpoint
ALTER TABLE "proposicoes"."relatoria" ADD COLUMN "casa" "casa" DEFAULT 'CAMARA' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "relatoria_proposicao_casa_unique" ON "proposicoes"."relatoria" USING btree ("proposicao_id","casa");