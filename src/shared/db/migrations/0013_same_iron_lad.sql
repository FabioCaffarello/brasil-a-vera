CREATE TABLE "usuario"."alert_policy" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"cadence" text DEFAULT 'weekly' NOT NULL,
	"channel_email" boolean DEFAULT true NOT NULL,
	"channel_inapp" boolean DEFAULT true NOT NULL,
	"topic_votacoes" boolean DEFAULT true NOT NULL,
	"topic_gastos" boolean DEFAULT false NOT NULL,
	"topic_proposicoes" boolean DEFAULT true NOT NULL,
	"topic_discursos" boolean DEFAULT false NOT NULL,
	"topic_divergencias" boolean DEFAULT true NOT NULL,
	"boost_eleicoes" boolean DEFAULT true NOT NULL,
	"boost_cpis" boolean DEFAULT true NOT NULL,
	"boost_proposicoes_marcadas" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuario"."user_profile" ADD COLUMN "themes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario"."alert_policy" ADD CONSTRAINT "alert_policy_user_id_user_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuario"."user_profile"("id") ON DELETE cascade ON UPDATE no action;