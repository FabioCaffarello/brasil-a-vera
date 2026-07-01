---
name: product-gap-analysis
description: |
  Mapeia a distância entre o que o produto entrega hoje e o que está
  documentado na visão (PRODUCT-VISION.md), personas (PERSONAS.md) e
  ADRs proposed. Produz: gaps por persona, ADRs sem implementação,
  features documentadas mas não entregues, e sugestão de próxima wave.
  Use quando o usuário quiser decidir "o que construir a seguir?".
---

Quando invocado (`/product-gap-analysis`), execute em ordem:

## Passo 1 — Carregue as fontes de verdade do produto

Leia em paralelo:
- `docs/product/PRODUCT-VISION.md`
- `docs/product/ROADMAP.md`
- `docs/product/PERSONAS.md` (se existir)
- `docs/product/METRICS.md` (se existir)

```bash
ls docs/product/
```

## Passo 2 — Inventário de ADRs proposed

```bash
grep -l "Status: proposed" docs/architecture/ADR/*.md | sort
```

Para cada ADR `proposed`, leia as seções **Contexto** e **Decisão** para
entender o que está esperando implementação.

## Passo 3 — Features documentadas mas não implementadas

```bash
# Issues abertas com labels de produto
gh issue list --state open --limit 50 \
  --json number,title,labels,milestone \
  --jq '.[] | select(.labels[].name | test("feature|enhancement|product|eixo")) | {number, title, labels: [.labels[].name]}'
```

```bash
# Docs de features em docs/features/ (se existir)
ls docs/features/ 2>/dev/null && cat docs/features/*.md 2>/dev/null | head -100
```

## Passo 4 — Cobertura atual por persona

Para cada persona identificada, liste:
- O que ela consegue fazer hoje no produto
- O que ela quer mas não consegue (per PRODUCT-VISION.md / issues)
- Qual o caminho mais curto para preencher o gap

Personas core do BaV: **Cidadão** (accountability), **Jornalista** (investigação),
**Sociedade Civil** (advocacy), **Desenvolvedor** (API/dados), **Pesquisador** (análise).

## Passo 5 — Síntese

### Mapa de Gaps

| Persona | Gap | Onde está bloqueado | Esforço (P/M/G) | Impacto |
|---------|-----|---------------------|-----------------|---------|

### ADRs proposed sem implementação correlata

| ADR | Título | Há issue/PR? | Recomendação |
|-----|--------|-------------|--------------|

### Sugestão de próxima wave

Com base nos gaps de maior impacto × menor esforço, proponha:
- **Foco da próxima wave** (1 parágrafo)
- **3-5 itens concretos** com referência a ADR/issue

### O que deliberadamente NÃO fazemos (e por quê)

Liste features pedidas / documentadas que foram conscientemente
descartadas (ADR-019: sem gargalo concreto, sem dado empírico) para
não gerar dívida de expectativa.

## O que NÃO faz este skill

- Não valida dados em prod
- Não cria issues (crie manualmente após revisar a análise)
- Não decide a wave — apresenta evidência para o owner decidir
- Para executar a decisão de implementação, use PREVC + skill relevante
