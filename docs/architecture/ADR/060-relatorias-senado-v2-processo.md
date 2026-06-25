# ADR-060 — Migração das relatorias do Senado para `/processo/relatoria`

**Status:** Aceito  
**Data:** 2026-06-24  
**Contexto:** Sprint 15.0

---

## Contexto

A ingestão de relatorias do Senado (ADR-044, emenda 2026-06-21) usava
`GET /senador/{id}/relatorias`. O Senado anunciou a descontinuação desse
endpoint (DataDesativacaoCompleta 2026-02-01). Na emenda de 2026-06-21
documentou-se que o endpoint ainda servia dados e foi mantido com aviso
`⚠️ LEGADA E FAIL-SOFT`.

Em 2026-06-24 o Senado disponibilizou o endpoint substituto:
`GET /processo/relatoria?codigoParlamentar={codigo}`.

**Probe empírico (2026-06-24, senador 5936 — Carlos Portinho):**

```
curl "https://legis.senado.leg.br/dadosabertos/processo/relatoria?codigoParlamentar=5936"

HTTP 200 · Content-Type: application/json · Content-Length: 285650
items: 219
tipos: {'Relator': 205, 'Relator Ad hoc': 13, 'Relator Revisor': 1}
ativos (dataDestituicao IS NULL): 34
encerrados: 185
```

---

## Decisão

Migrar `ingestion/senado/relatorias.ts` do endpoint legado para
`/processo/relatoria?codigoParlamentar={codigo}`. Atualizar schema Zod e
mapper mantendo a interface de saída (`RelatoriaSenado`) e a lógica de
upsert DB inalteradas.

**D1 — Escopo do filtro:** Manter filtro `descricaoTipoRelator === 'Relator'`
(exclui "Relator Ad hoc" e "Relator Revisor"), idêntico ao endpoint legado.

**D2 — Histórico vs. ativo:** Incluir todas as relatorias (ativas e
encerradas). O dedup por `codigoMateria` guarda a designação mais recente
(maior `dataDesignacao`), assim o relator corrente sempre vence sobre o
histórico — sem necessidade de filtrar por `dataDestituicao IS NULL`.

**D3 — Formato da data:** `dataDesignacao` vem como `"YYYY-MM-DD HH:MM:SS"`.
O mapper extrai apenas `"YYYY-MM-DD"` para compatibilidade com o campo
`designadoEm DATE` da tabela `relatoria`.

**D4 — Sem paginação:** O endpoint retorna todos os registros do parlamentar
em uma única resposta (array flat). Nenhuma paginação necessária.

**D5 — Substituição in-place:** Os arquivos existentes
(`relatorias-schema.ts`, `relatorias-mapper.ts`, `relatorias.ts`) são
atualizados diretamente. O registry e o `package.json` permanecem
inalterados (mesmo `id`, mesmo `script`).

---

## Consequências

- Endpoint fail-soft removido — ingestão passa a ser fail-hard por senador
  (erro de rede → loga + continua; zero upserts + todos com erro → exit 1).
- Dado histórico (relatorias encerradas) fica disponível na mesma query;
  a UI já filtra pelo relator atual via `designadoEm` mais recente.
- Os 9 senadores sem CPF (G3 resolvido parcialmente) não são afetados —
  a ingestão usa `sourceId` (código Senado), não CPF.
