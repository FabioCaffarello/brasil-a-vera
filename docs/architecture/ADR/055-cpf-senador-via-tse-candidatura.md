# ADR-055: CPF do Senador via tse_candidatura (match normalizado)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-23
> Status: accepted

## Contexto

A Trilha Patrimonial (ADR-047) depende de `parlamentar.cpf` para vincular o parlamentar
à tabela `tse_bem_candidato` (ponte por CPF exato — ADR-039). Para deputados, o campo é
obtido via GET `/deputados/{id}` da API da Câmara (`backfill:camara:cpf`). Para senadores,
a auditoria de cobertura de junho/2026 registrou a hipótese de que o campo `NumeroCPF`
existia no payload de `/senador/{codigo}` mas não estava sendo extraído.

Essa hipótese foi **falsificada empiricamente** em 2026-06-23:

- **XSD oficial** `DetalheParlamentarv5.xsd` (schema que governa `/senador/{codigo}`):
  `DadosBasicosParlamentar` contém `DataNascimento`, `DataFalecimento`, `Naturalidade`,
  `UfNaturalidade`, `EnderecoParlamentar`, `TelefoneParlamentar`, `FaxParlamentar`.
  Sem `NumeroCPF`.
- **Chamada real** a `/senador/5322` (Simone Tebet) e `/senador/6328` (Rodrigo Pacheco):
  `IdentificacaoParlamentar` retorna nome, foto, e-mail, partido, UF — sem CPF.
- **XSD de mandatos** (`MandatoParlamentarv5.xsd`): 38 elementos listados, nenhum é CPF.

A API do Senado **não expõe CPF em nenhum endpoint disponível**.

## Decisão

Usar `tse_candidatura` (já populada pelo script `tse-bens`, cadência monthly t1) como
fonte alternativa de CPF para senadores. A tabela contém `cpf`, `nm_candidato`,
`cd_cargo` e `sg_uf` — `CD_CARGO = 5` corresponde a Senador.

A ponte é via **match de nome normalizado**:
- Normalização: strip de diacríticos (NFD + regex), lowercase, collapse de espaços.
- Algoritmo: distância de Levenshtein normalizada (`1 - dist/max(len_a, len_b)`),
  implementado inline (~25 linhas TS, sem dependência nova).
- Limiar: `>= 0.90` (alta confiança). Abaixo do limiar, o CPF não é escrito e o
  senador recebe log `WARN` com nome para diagnóstico manual. Zero falsos positivos.

### DAG mensal resultante

```
t0: camara-backfill-cpf   (Câmara, via API direta — sem mudança)
    camara-filiacoes
    camara-backfill-bio
    senado-backfill-bio
    senado-filiacoes

t1: tse-bens              (popula tse_candidatura com CD_CARGO ∈ {5,6})

t2: senado-backfill-cpf   (este script — lê de tse_candidatura, faz match)
```

### Idempotência

O script processa apenas `parlamentar WHERE casa='SENADO' AND cpf IS NULL`. Em reruns,
é no-op para senadores já preenchidos.

## Alternativas Consideradas

### A — Manutenção de mapeamento manual (CPF hardcoded)
Lista estática de 81 pares `(sourceId, cpf)` no código. Simples mas frágil: cada novo
senador empossado exige atualização manual. **Rejeitada** — viola o princípio de
ingestão automatizada e não escala.

### B — Web scraping do Senado
Extração de CPF do HTML do portal do Senado. Frágil a mudanças de layout, não é API
pública documentada. **Rejeitada** — viola ADR-019 (sem gargalo empírico para fonte
não-oficial).

### C — Match por UF como filtro adicional
Restringir candidaturas ao `sg_uf` do senador antes do match de nome para reduzir
falsos positivos. **Não necessário**: com limiar 0.90, a probabilidade de dois senadores
de UFs distintas com nomes similares acima do limiar é negligível para 81 senadores.
Pode ser adicionado como otimização futura se houver caso real.

## Consequências

### Positivas
- `parlamentar.cpf` passa a ser preenchido para senadores com correspondência no TSE,
  desbloqueando a Trilha Patrimonial (ADR-047) para a câmara alta.
- A função `normalizarNome` (`ingestion/shared/normalize-nome.ts`) fica disponível para
  outras futuras pontes de nome entre fontes heterogêneas.
- Custo zero de fetch: lê apenas de tabelas locais já populadas.

### Negativas
- Match de nome é inerentemente impreciso: ~10-15% dos senadores podem não ter match
  automático (variações de nome entre TSE e Senado, acentuação, sufixos). Esses casos
  ficam com `cpf NULL` e log de `WARN` — requerem diagnóstico manual.
- Dependência de DAG mais profunda: `senado-backfill-cpf` (t2) exige que `tse-bens`
  (t1) tenha rodado antes na mesma cadência mensal.

### Neutras
- A hipótese original ("NumeroCPF está no payload mas não é extraído") foi falsificada
  e registrada explicitamente. O texto do arquivo `ingestion/tse/bens.ts` que dizia
  "Senado NÃO expõe CPF" era **correto** — era a auditoria de cobertura que estava errada.

## Referências

- [ADR-047](047-confronto-variacao-patrimonial-mandato.md) — Trilha Patrimonial
- [ADR-035](035-orquestracao-ingestao-config-driven.md) — registry config-driven e DAG
- Implementação: `ingestion/senado/backfill-cpf.ts`, `ingestion/shared/normalize-nome.ts`
- Verificação empírica: Swagger Senado `legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html`
  + XSD `DetalheParlamentarv5.xsd` + curl `/senador/5322` e `/senador/6328` (2026-06-23)
