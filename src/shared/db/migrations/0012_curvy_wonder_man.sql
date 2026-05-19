CREATE TABLE "usuario"."follows" (
	"user_id" uuid NOT NULL,
	"parlamentar_id" uuid NOT NULL,
	"followed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_user_id_parlamentar_id_pk" PRIMARY KEY("user_id","parlamentar_id")
);
--> statement-breakpoint
ALTER TABLE "usuario"."follows" ADD CONSTRAINT "follows_user_id_user_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuario"."user_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario"."follows" ADD CONSTRAINT "follows_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "parlamentares"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_parlamentar_id_idx" ON "usuario"."follows" USING btree ("parlamentar_id");