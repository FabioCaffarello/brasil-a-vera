CREATE SCHEMA "usuario";
--> statement-breakpoint
CREATE TABLE "usuario"."user_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"uf" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"onboarded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_clerk_user_id_unique" ON "usuario"."user_profile" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "user_profile_active_idx" ON "usuario"."user_profile" USING btree ("deleted_at") WHERE "usuario"."user_profile"."deleted_at" IS NULL;