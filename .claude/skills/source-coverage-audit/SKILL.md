---
name: source-coverage-audit
description: |
  Analisa estaticamente os scripts de ingestão (ingestion/) e o schema do
  banco para mapear QUAIS dados públicos do Legislativo brasileiro estão
  cobertos hoje vs. quais existem nas fontes. Produz relatório por eixo
  (Parlamentares, Proposições, Votações, Gastos, Eleitoral). Não faz
  fetch — lê código. Use antes de planejar nova ingestão, ou quando o
  usuário perguntar "o que já temos vs o que falta?".
---

Quando invocado (`/source-coverage-audit`), execute as verificações abaixo
em paralelo usando `Bash` e sintetize um relatório de cobertura por eixo.

## Fase 1 — Inventário do registry

```bash
# Quais fontes estão registradas?
cat ingestion/registry.ts | grep -E "id:|url:|description:" | head -60
```

```bash
# Quais scripts existem no diretório de ingestão?
find ingestion -name "main.ts" | sort
```

## Fase 2 — Cobertura por eixo (leitura de schema)

```bash
# Tabelas existentes no schema consolidado
grep -E "^export const " src/shared/db/schema.ts | sort
```

```bash
# Migrations aplicadas (proxy de tabelas reais em prod)
ls src/shared/db/migrations/ | sort
```

## Fase 3 — Campos opcionais / vazios (indício de ingestão incompleta)

Para cada aggregate root, verificar se há campos nullable que indicam
dado não-ingerido:

```bash
grep -rE "\.?\.$|: null\b" src/modules/*/domain/*.ts 2>/dev/null | head -30
```

```bash
# Colunas nullable no schema Drizzle (proxy de gaps de ingestão)
grep -rE "\.\s*nullable\(\)" src/modules/ src/shared/db/schema.ts 2>/dev/null | grep -v ".test." | wc -l
```

## Fase 4 — Endpoints das APIs públicas disponíveis (via DATA-SOURCES.md)

```bash
cat docs/architecture/DATA-SOURCES.md
```

## Síntese — Relatório de Cobertura

Produza uma tabela por eixo:

| Eixo | Fonte | O que temos | O que existe na API mas não temos | Issues conhecidas |
|------|-------|-------------|-----------------------------------|-------------------|
| Parlamentares | Câmara API | deputados, comissões, lideranças | discursos (metadados ok, feature pausada) | #48 |
| ... | ... | ... | ... | ... |

### Gaps prioritários

Liste os 5 maiores gaps por impacto na persona **Cidadão** (quem busca
accountability do seu representante), ordenados por:
1. Dado já existe na fonte pública
2. Ingestão seria simples (CSV ou endpoint já mapeado)
3. Alta visibilidade (feature solicitada / issue aberta)

### Confiabilidade das fontes

Para cada API, anote:
- Estabilidade conhecida (instável / razoável / estável)
- Formato (REST JSON / CSV bulk / XML)
- Frequência de atualização na fonte
- Nossa frequência de ingestão atual (daily / weekly / monthly / manual)

## O que NÃO faz este skill

- Não valida os dados em prod (precisaria de Neon ativo)
- Não faz fetch das APIs públicas
- Não propõe implementação — só diagnóstico
- Para proposta de roadmap a partir dos gaps, use `/product-gap-analysis`
