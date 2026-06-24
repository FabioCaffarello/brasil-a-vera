-- Sprint 13.0 — G10: afastamentos e licenças de senadores
-- ADR-058: senador pode estar afastado (licença médica, cargo no Executivo,
-- etc.) o que explica votos "AUSENTE". Fonte: GET /senador/{id}/licencas.
-- Trust L1, cadência mensal, schema parlamentares.

CREATE TABLE "parlamentares"."afastamento_senador" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parlamentar_id" uuid NOT NULL
    REFERENCES "parlamentares"."parlamentar"("id") ON DELETE CASCADE,
  -- Sigla do motivo conforme vocabulário da API (ex: "SS", "LMM", "LCE").
  "motivo_sigla" text NOT NULL,
  -- Descrição legível do motivo (ex: "Saúde", "Licença para tratar de interesses particulares").
  "motivo_descricao" text,
  "data_inicio" date NOT NULL,
  -- NULL = afastamento ainda em curso no momento da ingestão.
  "data_fim" date,
  "trust_level" "trust_level" NOT NULL DEFAULT 'L1',
  "source_url" text NOT NULL,
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "afastamento_senador_natural_key"
  ON "parlamentares"."afastamento_senador"("parlamentar_id", "motivo_sigla", "data_inicio");
--> statement-breakpoint
CREATE INDEX "afastamento_senador_parlamentar_id_idx"
  ON "parlamentares"."afastamento_senador"("parlamentar_id");
