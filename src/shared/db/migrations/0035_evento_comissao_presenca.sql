-- Sprint 30: tabela de presença em reuniões deliberativas de comissão (Câmara).
-- Câmara-only — Senado não expõe endpoint equivalente (ADR-061/ADR-062).
-- Filtragem por descricaoTipo deliberativo feita no script de ingestão.
CREATE TABLE IF NOT EXISTS parlamentares.evento_comissao_presenca (
  id             uuid PRIMARY KEY,
  evento_id      bigint NOT NULL,
  parlamentar_id uuid NOT NULL
    REFERENCES parlamentares.parlamentar(id) ON DELETE CASCADE,
  data_evento    date NOT NULL,
  descricao_tipo text NOT NULL,
  orgao_sigla    text,
  legislatura    integer NOT NULL,
  ingested_at    timestamptz NOT NULL DEFAULT now()
);

-- Chave natural: par (evento, parlamentar) é único — idempotência sem upsert.
CREATE UNIQUE INDEX IF NOT EXISTS evento_comissao_presenca_natural_key
  ON parlamentares.evento_comissao_presenca (evento_id, parlamentar_id);

-- Query de leitura: todos os eventos de um deputado por data desc.
CREATE INDEX IF NOT EXISTS evento_comissao_presenca_parlamentar_data_idx
  ON parlamentares.evento_comissao_presenca (parlamentar_id, data_evento DESC);
