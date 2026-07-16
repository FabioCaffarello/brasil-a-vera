CREATE TABLE "parlamentares"."comissionado_gabinete" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	"casa" "casa" NOT NULL,
	"nome" text NOT NULL,
	"grupo" text NOT NULL,
	"cargo" text,
	"remuneracao_basica" numeric(12, 2),
	"mes_referencia" date,
	"source_id" text,
	"trust_level" "trust_level" DEFAULT 'L1' NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parlamentares"."comissionado_gabinete" ADD CONSTRAINT "comissionado_gabinete_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "comissionado_gabinete_parlamentar_id_idx" ON "parlamentares"."comissionado_gabinete" USING btree ("parlamentar_id");
