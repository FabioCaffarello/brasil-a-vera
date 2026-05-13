ALTER TABLE "proposicoes"."proposicao" ADD COLUMN "source_id_camara" text;--> statement-breakpoint
ALTER TABLE "proposicoes"."proposicao" ADD COLUMN "source_id_senado" text;--> statement-breakpoint
ALTER TABLE "proposicoes"."proposicao" ADD COLUMN "source_url_camara" text;--> statement-breakpoint
ALTER TABLE "proposicoes"."proposicao" ADD COLUMN "source_url_senado" text;--> statement-breakpoint
-- Backfill: distribui o source_id/source_url existente para a coluna
-- da casa que ingeriu por último, identificada pelo padrão da URL.
-- Idempotente — UPDATEs por LIKE reescrevem o mesmo valor em re-runs.
-- Issue #74 detalha o contexto do bug original (último ingestor
-- sobrescrevendo source_id da outra casa).
UPDATE "proposicoes"."proposicao"
  SET "source_id_camara" = "source_id",
      "source_url_camara" = "source_url"
  WHERE "source_url" LIKE '%dadosabertos.camara%';--> statement-breakpoint
UPDATE "proposicoes"."proposicao"
  SET "source_id_senado" = "source_id",
      "source_url_senado" = "source_url"
  WHERE "source_url" LIKE '%senado.leg.br%';