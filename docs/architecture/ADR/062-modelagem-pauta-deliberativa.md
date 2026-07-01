# ADR-062 — Modelagem de presença em comissões (tabela + ingestão)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-30
> Status: accepted

| Campo | Valor |
|-------|-------|
| Status | accepted |
| Data | 2026-06-30 |
| Autor | FabioCaffarello |
| Decisores | FabioCaffarello |
| Relacionado | ADR-061 (escopo), ADR-056 (lideranças), ADR-017 (índices/EXPLAIN) |

---

## Contexto

ADR-061 decidiu ingerir presença em eventos deliberativos da Câmara (~865/ano × ~50
deputados). Precisamos decidir:

1. **Modelagem**: nova tabela dedicada ou extensão da tabela `sessao` existente?
2. **Ingestão**: loop por evento (push) ou por deputado (pull)?
3. **Bulk file**: `votacoesObjetos-{ano}.json` serve como complemento ao backfill de
   `votacao → proposicao`?

### Probe do bulk file — 2026-06-30

```
HEAD https://dadosabertos.camara.leg.br/arquivos/votacoesObjetos/json/votacoesObjetos-2024.json
Content-Length: 41.971.702 bytes (~40 MB)
```

Amostra do primeiro registro:
```json
{
  "idVotacao": "2355879-42",
  "data": "2024-02-06",
  "descricao": "Aprovado o Substitutivo ao PL nº 1.825, de 2023...",
  "proposicao_": {
    "id": 2380451,
    "uri": "https://dadosabertos.camara.leg.br/api/v2/proposicoes/2380451",
    "ementa": "Requer urgência para o PL 1825/2023..."
  }
}
```

**Conclusão sobre o bulk file**: o campo `proposicao_` já traz `id` da proposição
vinculada diretamente — é exatamente o dado que o `backfill-votacao-proposicao` resolve
via chamadas individuais (`GET /votacoes/{id}`). O bulk file é uma alternativa de O(1)
downloads vs O(n) chamadas. **Será abordado em ADR separado** (issue #567 — backfill
não escala a backlog histórico).

---

## Opções de modelagem

### A — Nova tabela `evento_comissao_presenca` (ESCOLHIDA)

```sql
CREATE TABLE camara.evento_comissao_presenca (
  id            uuid PRIMARY KEY,
  evento_id     bigint NOT NULL,          -- id do evento na API Câmara
  parlamentar_id uuid REFERENCES parlamentar(id) ON DELETE CASCADE,
  data_evento   date NOT NULL,
  descricao_tipo text NOT NULL,           -- "Reunião Deliberativa" etc.
  orgao_sigla   text,                     -- ex.: "CCJC", "CFT"
  legislatura   integer NOT NULL,
  ingested_at   timestamptz NOT NULL DEFAULT now()
);
-- Chave natural: (evento_id, parlamentar_id) — sem duplicata por re-ingestão
CREATE UNIQUE INDEX ON camara.evento_comissao_presenca (evento_id, parlamentar_id);
-- Leitura: "todos os eventos de um deputado" — cobre a query do perfil
CREATE INDEX ON camara.evento_comissao_presenca (parlamentar_id, data_evento DESC);
```

- Isolada: não polui `sessao` (que já tem semântica própria de plenário)
- Schema em `src/modules/parlamentares/domain/schema.ts` ou novo módulo `eventos/`
- Footprint estimado: ~35 MB em 4 anos (ADR-061)

### B — Extensão de `sessao` com flag de tipo

- `sessao` foi modelada para sessões plenárias (Câmara); misturar com reuniões de
  comissão cria ambiguidade de `orgaoSigla` e `tipo`
- Queries de plenário passariam a filtrar por tipo — overhead e risco de regressão
- **Descartada**

---

## Decisão

**Opção A.** Nova tabela `evento_comissao_presenca` no schema `camara`.

### Estratégia de ingestão

**Loop por evento** (não por deputado):

```
GET /eventos?dataInicio={INICIO}&dataFim={FIM}&itens=100 [paginado]
  → para cada evento deliberativo:
    GET /eventos/{id}/deputados
      → DELETE WHERE evento_id = {id} + INSERT deputados
```

Justificativa:
- Um evento tem ~50 deputados em média — 1 call por evento é mais eficiente que
  ~534 calls por deputado (que exigiria 534 × N eventos filtrados)
- Idempotência por evento: DELETE + INSERT por `evento_id`
- Janela de ingestão: últimos 90 dias (cron mensal); backfill histórico em script separado

### Sobre o `votacoesObjetos` bulk file

**Não será usado para presença.** O arquivo contém votações com `proposicao_`, não
listas de presença. É relevante apenas para o issue #567 (`backfill-votacao-proposicao`).
ADR a ser escrito quando o issue for retomado.

---

## Consequências

- **Migration 0035**: `CREATE TABLE camara.evento_comissao_presenca (...)` — Sprint 30
- **Script**: `ingestion/camara/presenca-comissoes.ts` — Sprint 30
- **UI**: seção "Presença em comissões" no perfil do parlamentar — Sprint 30
- **Índice de leitura**: `(parlamentar_id, data_evento DESC)` — EXPLAIN ANALYZE
  obrigatório antes do merge (ADR-017)
- **Senado**: assimetria permanente (API não expõe equivalente); nota na UI

## Estimativa de footprint consolidada

| Período | Eventos | Rows | Tamanho estimado |
|---------|---------|------|-----------------|
| 1 ano (2024) | 865 | 43.250 | ~8,6 MB |
| 4 anos (2023–2026) | 3.460 | 173.000 | ~35 MB |
| 10 anos | 8.650 | 432.500 | ~86 MB |

Free tier Neon: 0,5 GB. Com as demais tabelas (~300 MB estimado atual), há
margem para ~200 MB adicionais. 10 anos de presença em comissões cabem.
