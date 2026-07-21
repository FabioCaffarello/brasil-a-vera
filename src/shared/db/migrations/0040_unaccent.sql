-- Extensão unaccent: busca e ordenação accent-insensitive.
-- Auditoria UX 2026-07-20 (P1.2/P1.3): "educacao" não encontrava "Educação"
-- (ILIKE cru) e a listagem ordenava em byte-order ("ANDRÉ" antes de "Abilio").
CREATE EXTENSION IF NOT EXISTS unaccent;
