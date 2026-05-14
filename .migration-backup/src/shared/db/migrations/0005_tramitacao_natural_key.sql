ALTER TABLE "proposicoes"."tramitacao" ADD COLUMN "descricao_resumida" text NOT NULL;--> statement-breakpoint
ALTER TABLE "proposicoes"."tramitacao" ADD COLUMN "descricao_completa" text;--> statement-breakpoint
ALTER TABLE "proposicoes"."tramitacao" ADD COLUMN "situacao_resultante" text;--> statement-breakpoint
ALTER TABLE "proposicoes"."tramitacao" ADD COLUMN "source_id" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tramitacao_proposicao_source_unique" ON "proposicoes"."tramitacao" USING btree ("proposicao_id","source_id");--> statement-breakpoint
ALTER TABLE "proposicoes"."tramitacao" DROP COLUMN "descricao";--> statement-breakpoint
ALTER TABLE "proposicoes"."tramitacao" DROP COLUMN "situacao";