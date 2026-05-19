CREATE TABLE "usuario"."consent_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"scope" text NOT NULL,
	"granted" boolean NOT NULL,
	"legal_basis" text NOT NULL,
	"policy_version" text NOT NULL,
	"source" text NOT NULL,
	"ip_hash" text DEFAULT '' NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuario"."user_profile" ADD COLUMN "marketing_opted_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario"."user_profile" ADD COLUMN "survey_opted_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario"."consent_log" ADD CONSTRAINT "consent_log_user_id_user_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuario"."user_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_log_user_id_idx" ON "usuario"."consent_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consent_log_user_scope_idx" ON "usuario"."consent_log" USING btree ("user_id","scope");