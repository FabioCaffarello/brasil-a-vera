CREATE TABLE "votacoes"."presenca_sessao" (
	"sessao_id" uuid NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	CONSTRAINT "presenca_sessao_pk" PRIMARY KEY("sessao_id","parlamentar_id")
);
--> statement-breakpoint
CREATE TABLE "votacoes"."sessao" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"casa" "casa" NOT NULL,
	"data_hora" timestamp with time zone NOT NULL,
	"descricao" text NOT NULL,
	"trust_level" "trust_level" NOT NULL,
	"source_url" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "votacoes"."presenca_sessao" ADD CONSTRAINT "presenca_sessao_sessao_id_sessao_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "votacoes"."sessao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votacoes"."presenca_sessao" ADD CONSTRAINT "presenca_sessao_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "presenca_sessao_parlamentar_id_idx" ON "votacoes"."presenca_sessao" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessao_casa_source_unique" ON "votacoes"."sessao" USING btree ("casa","source_id");--> statement-breakpoint
CREATE INDEX "sessao_data_hora_idx" ON "votacoes"."sessao" USING btree ("data_hora");