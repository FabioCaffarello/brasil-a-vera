CREATE TABLE "usuario"."alert_delivery" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text NOT NULL,
	"body_md" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"status" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuario"."alert_delivery" ADD CONSTRAINT "alert_delivery_user_id_user_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "usuario"."user_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_delivery_idempotency_key_unique" ON "usuario"."alert_delivery" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "alert_delivery_user_scheduled_idx" ON "usuario"."alert_delivery" USING btree ("user_id","scheduled_for");