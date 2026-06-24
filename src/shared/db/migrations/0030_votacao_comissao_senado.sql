-- Sprint 12.3 — Votações em Comissão do Senado
-- ADR-057: tabela separada de votacao (Senado-only, sem boolean aprovada)
-- source_id = codigoSessaoVotacao; materia_source_id para backfill futuro.

CREATE TABLE "votacoes"."votacao_comissao_senado" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" text NOT NULL,
  "comissao_sigla" text NOT NULL,
  "data_sessao" date NOT NULL,
  "descricao" text NOT NULL,
  "resultado" text,
  "materia_source_id" text,
  "votos_sim" integer NOT NULL,
  "votos_nao" integer NOT NULL,
  "abstencoes" integer NOT NULL,
  "trust_level" "trust_level" NOT NULL,
  "source_url" text NOT NULL,
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "votacao_comissao_senado_source_id_unique"
  ON "votacoes"."votacao_comissao_senado"("source_id");
--> statement-breakpoint
CREATE INDEX "votacao_comissao_senado_comissao_sigla_idx"
  ON "votacoes"."votacao_comissao_senado"("comissao_sigla");
--> statement-breakpoint
CREATE INDEX "votacao_comissao_senado_data_sessao_idx"
  ON "votacoes"."votacao_comissao_senado"("data_sessao");
--> statement-breakpoint

CREATE TABLE "votacoes"."voto_nominal_comissao_senado" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "votacao_id" uuid NOT NULL REFERENCES "votacoes"."votacao_comissao_senado"("id") ON DELETE CASCADE,
  "parlamentar_id" uuid REFERENCES "parlamentares"."parlamentar"("id") ON DELETE SET NULL,
  "senador_source_id" text NOT NULL,
  "voto" "tipo_voto" NOT NULL,
  "partido_sigla_voto" text,
  "uf_voto" char(2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "voto_nominal_comissao_senado_votacao_senador_unique"
  ON "votacoes"."voto_nominal_comissao_senado"("votacao_id", "senador_source_id");
--> statement-breakpoint
CREATE INDEX "voto_nominal_comissao_senado_parlamentar_id_idx"
  ON "votacoes"."voto_nominal_comissao_senado"("parlamentar_id");
