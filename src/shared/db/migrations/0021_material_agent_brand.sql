CREATE SCHEMA "discursos";
--> statement-breakpoint
CREATE TABLE "discursos"."discurso" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	"casa" "casa" NOT NULL,
	"source_id" text,
	"data" timestamp with time zone NOT NULL,
	"tipo" text NOT NULL,
	"sumario" text,
	"keywords" text,
	"url_texto" text,
	"trust_level" "trust_level" NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discursos"."discurso" ADD CONSTRAINT "discurso_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discurso_parlamentar_id_idx" ON "discursos"."discurso" USING btree ("parlamentar_id");