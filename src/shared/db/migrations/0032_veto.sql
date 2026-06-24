-- Sprint 13.2 — G12: vetos presidenciais e votos do Congresso Nacional
-- ADR-059: 3 tabelas (veto, dispositivo_veto, voto_veto) no schema vetos.
-- Trust L1, cadência anual/mensal, Senado-only nos votos nominais.

CREATE SCHEMA IF NOT EXISTS "vetos";
--> statement-breakpoint

-- Um veto presidencial por linha (VET número/ano).
-- source_id = Veto.Codigo da API do Senado (chave natural única).
CREATE TABLE "vetos"."veto" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Veto.Codigo — chave da API (numérico como string)
  "source_id" text NOT NULL,
  -- Veto.Materia.Codigo — usado para montar URL de resultado
  "materia_codigo" text NOT NULL,
  -- Veto.Materia.Numero + Ano (ex: VET 49/2024)
  "numero" text NOT NULL,
  "ano" integer NOT NULL,
  "ementa" text NOT NULL,
  -- Matéria original vetada (PL, PLC, etc.)
  "materia_vetada_sigla" text,
  "materia_vetada_numero" text,
  "materia_vetada_ano" integer,
  "materia_vetada_ementa" text,
  -- Total="Sim" → true (veto total); Total="Não" → false (parcial)
  "veto_total" boolean NOT NULL DEFAULT false,
  "assunto" text,
  -- Data em que o presidente publicou o veto no DOU
  "data_publicacao" date,
  -- Data em que o Congresso recebeu o veto
  "data_recebimento_congresso" date,
  "em_tramitacao" boolean NOT NULL DEFAULT true,
  "trust_level" "trust_level" NOT NULL DEFAULT 'L1',
  "source_url" text NOT NULL,
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "veto_source_id_idx"
  ON "vetos"."veto"("source_id");
--> statement-breakpoint
CREATE INDEX "veto_ano_idx"
  ON "vetos"."veto"("ano");
--> statement-breakpoint

-- Um trecho/artigo vetado por linha (um veto pode ter vários dispositivos).
-- source_id = Dispositivo.Codigo da API.
CREATE TABLE "vetos"."dispositivo_veto" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "veto_id" uuid NOT NULL
    REFERENCES "vetos"."veto"("id") ON DELETE CASCADE,
  -- Dispositivo.Codigo
  "source_id" text NOT NULL,
  -- Identificador legível: ex. "49.24.001"
  "identificador" text NOT NULL,
  "descricao" text,
  "assunto" text,
  -- NULL quando ainda em tramitação
  "situacao" text,
  -- Cédula | Painel
  "tipo_votacao" text,
  "data_sessao" date,
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dispositivo_veto_source_id_idx"
  ON "vetos"."dispositivo_veto"("source_id");
--> statement-breakpoint
CREATE INDEX "dispositivo_veto_veto_id_idx"
  ON "vetos"."dispositivo_veto"("veto_id");
--> statement-breakpoint

-- Voto nominal de senador em dispositivo de veto (Senado-only — ADR-059).
-- parlamentar_id nullable: match por nome+UF pode falhar → armazena nome_raw.
CREATE TABLE "vetos"."voto_veto" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dispositivo_id" uuid NOT NULL
    REFERENCES "vetos"."dispositivo_veto"("id") ON DELETE CASCADE,
  "parlamentar_id" uuid
    REFERENCES "parlamentares"."parlamentar"("id") ON DELETE SET NULL,
  -- Nome exato conforme retornado pela API (para auditoria)
  "nome_raw" text NOT NULL,
  "partido_raw" text,
  "uf_raw" text,
  -- Normalizado: SIM | NAO | ABSTENCAO
  "voto" text NOT NULL,
  -- Apenas SENADO nesta versão
  "casa" text NOT NULL DEFAULT 'SENADO',
  "ingested_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "voto_veto_natural_key"
  ON "vetos"."voto_veto"("dispositivo_id", "nome_raw", "casa");
--> statement-breakpoint
CREATE INDEX "voto_veto_dispositivo_id_idx"
  ON "vetos"."voto_veto"("dispositivo_id");
--> statement-breakpoint
CREATE INDEX "voto_veto_parlamentar_id_idx"
  ON "vetos"."voto_veto"("parlamentar_id");
