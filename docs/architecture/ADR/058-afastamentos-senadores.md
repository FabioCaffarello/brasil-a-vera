# ADR-058 — Afastamentos e licenças de senadores

**Status:** Accepted
**Data:** 2026-06-23
**Sprint:** 13.0 (G10 da auditoria de lacunas)

---

## Contexto

A auditoria de cobertura de fontes (jun/2026, docs/audits/2026-06-api-gaps-planejamento.md)
identificou que senadores podem estar ausentes de votações por motivos legítimos —
licença médica, exercício de cargo no Executivo, representação externa — e que essa
ausência não é capturada no banco, gerando falso "AUSENTE" no perfil de alinhamento.

A API do Senado expõe `GET /senador/{codigo}/licencas` com histórico completo de
afastamentos e licenças de cada parlamentar.

---

## Decisão

Criar tabela `parlamentares.afastamento_senador` para armazenar licenças e
afastamentos de senadores com chave natural `(parlamentar_id, motivo_sigla, data_inicio)`.

Campos-chave:
- `motivo_sigla`: sigla conforme vocabulário da API (ex: `LICENCA_ATIVIDADE_PARLAMENTAR`,
  `SS`, `LCE`)
- `motivo_descricao`: descrição legível (ex: "Saúde", "Licença para cargo no Executivo")
- `data_inicio` / `data_fim`: período do afastamento; `data_fim NULL` = em curso

**Trust L1** (fonte primária Senado).
**Cadência mensal** (afastamentos mudam raramente).
**Cache 24h** (TTL.afastamentos) — ingestão mensal, dado quase-estático.

---

## UI

Badge "Em licença" no cabeçalho do perfil do senador quando há afastamento ativo
(data_fim IS NULL ou >= today). A descrição do motivo aparece no tooltip/label.

Câmara não tem endpoint equivalente — query retorna `[]` para deputados sem erro.

---

## Consequências

- Auditores e cidadãos entendem que "AUSENTE" pode ser ausência legítima.
- Falso positivo de inatividade reduzido na leitura do alinhamento.
- Senado-only na prática: a Câmara não publica endpoint de licenças nesse formato.
