---
name: swot-analysis
description: |
  Executa uma análise SWOT estruturada do Brasil a Vera como produto de
  transparência cívica. Considera: stack técnica, modelo de custo,
  cobertura de dados, posicionamento vs. alternativas (Câmara, Senado,
  Transparência Brasil, etc.), personas e contexto regulatório brasileiro.
  Produz relatório SWOT com ações priorizadas. Use quando o usuário
  quiser "avaliar onde estamos" ou "pensar a direção do produto".
---

Quando invocado (`/swot-analysis [foco opcional]`):

O argumento opcional `[foco]` pode restringir a análise:
- `tecnico` — foca em stack, arquitetura, operação
- `produto` — foca em features, personas, cobertura
- `mercado` — foca em competidores, posicionamento, adoção
- sem argumento — análise completa

## Passo 1 — Carregue o contexto atual

Leia em paralelo:
```bash
cat docs/product/PRODUCT-VISION.md
cat CLAUDE.md | head -60
```

```bash
# Estado real do produto (rotas existentes)
find src/app -name "page.tsx" | grep -v "_" | sort | head -30
```

```bash
# Issues abertas como proxy de fraquezas conhecidas
gh issue list --state open --limit 20 --json number,title,labels \
  --jq '.[] | "\(.number): \(.title)"'
```

## Passo 2 — Análise por quadrante

### Forças (Strengths)

Avalie objetivamente baseado no código e docs reais:

1. **Modelo de custo**: Cloudflare Workers (edge gratuito) + Neon free tier → custo operacional próximo de zero
2. **Dados públicos abertos**: APIs da Câmara, Senado, TSE são públicas → sem dependência de acordos
3. **Pirâmide de Confiança (L1-L4)**: diferencial único — transparência sobre nível de certeza dos dados
4. **Stack moderna**: Next.js 16 + App Router + TypeScript strict + Cloudflare → performance de edge
5. **Código auditável**: PolyForm Noncommercial → qualquer cidadão pode verificar a metodologia
6. **Cobertura de dados**: [listar o que existe com base em /source-coverage-audit]
7. Outros pontos fortes observados no código/docs

### Fraquezas (Weaknesses)

1. **Cota Neon free tier**: escala limitada → HTTP 402 em picos (incidente jun/2026)
2. **Projeto solo**: 1 dev → velocidade limitada, bus factor = 1
3. **Ingestão instável**: APIs brasileiras são instáveis (Câmara/Senado sem SLA público)
4. **Gaps de cobertura**: [listar gaps identificados — doações TSE, presença física, etc.]
5. **UX ainda em evolução**: sem pesquisa com usuários reais documentada
6. Outros pontos fracos observados

### Oportunidades (Opportunities)

1. **Eleições 2026**: ciclo eleitoral aumenta demanda por dados de candidatos
2. **LLMs sobre dados cívicos**: potencial para Q&A natural sobre parlamentares (wave futura)
3. **API pública**: desenvolvedores e jornalistas são multiplicadores (issue pendente)
4. **Grafo legislativo**: visualização de rede de co-votação é diferencial sem concorrente direto
5. **Integração com portais de jornalismo de dados**: Agência Pública, Piauí, The Intercept
6. **Dados do Executivo**: Portal da Transparência já parcialmente mapeado
7. Outras oportunidades identificadas

### Ameaças (Threats)

1. **Instabilidade das fontes**: mudança de API da Câmara/Senado pode quebrar ingestão silenciosamente
2. **Alteração de dados na fonte**: retificações retroativas que invalidam L1 histórico
3. **Concorrência de portais oficiais**: melhorias no próprio site da Câmara/Senado reduzem diferencial
4. **Custo de escala**: se viralizar sem patrocínio, cota Neon explode antes de tier pago
5. **Contexto regulatório**: LGPD + transparência ativa — linha tênue entre dado público e privacidade
6. **Desinformação**: dados corretos mal interpretados podem gerar polêmica desnecessária
7. Outras ameaças identificadas

## Passo 3 — Matriz de Estratégias

| | Forças | Fraquezas |
|---|---|---|
| **Oportunidades** | **SO — Alavancagem**: use forças para capturar oportunidades | **WO — Desenvolvimento**: supere fraquezas para capturar oportunidades |
| **Ameaças** | **ST — Mitigação**: use forças para neutralizar ameaças | **WT — Defesa**: minimize fraquezas e evite ameaças |

Para cada célula, liste 2-3 ações concretas com referência a ADR/issue
existente ou proposta de issue nova.

## Passo 4 — Top 5 Ações Priorizadas

Com base na matriz, liste as 5 ações mais impactantes ordenadas por
impacto × urgência × viabilidade (dado o contexto solo + custo-zero):

1. **[Ação]** — Quadrante XX — Why now: [argumento]
2. ...

## Apresentação

- Seja honesto sobre fraquezas — SWOT útil não suaviza pontos fracos
- Baseie-se em evidências (código, issues, incidentes reais) — não em especulação
- Cada ponto do SWOT deve ter ao menos 1 referência (issue, ADR, incidente, doc)
- Mantenha foco no contexto: plataforma cívica, 1 dev, custo-zero, doação
