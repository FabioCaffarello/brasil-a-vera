CREATE TABLE "usuario"."data_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"result_url" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "usuario"."data_request" ADD CONSTRAINT "data_request_user_id_user_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuario"."user_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_request_user_requested_idx" ON "usuario"."data_request" USING btree ("user_id","requested_at");