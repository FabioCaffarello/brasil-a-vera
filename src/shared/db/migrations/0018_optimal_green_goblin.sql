CREATE TYPE "public"."tipo_lideranca" AS ENUM('P', 'B');--> statement-breakpoint
ALTER TABLE "votacoes"."orientacao_bancada" ADD COLUMN "tipo_lideranca" "tipo_lideranca" DEFAULT 'P' NOT NULL;