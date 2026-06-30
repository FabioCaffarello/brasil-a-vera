-- Sprint 28: adiciona qt_votos_nominais em tse_candidatura.
-- Coluna nullable (NULL = CSV do pleito ainda não tem o campo ou candidato
-- não obteve votos nominais — ex.: substituição tardia). Backfill via
-- re-ingestão de consulta_cand_{ano}_BRASIL.csv com script tse-bens.
ALTER TABLE eleitoral.tse_candidatura
  ADD COLUMN IF NOT EXISTS qt_votos_nominais integer;
