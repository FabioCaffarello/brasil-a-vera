# ADR-019: Disciplina arquitetural — não introduzir infraestrutura sem gargalo empírico

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-13
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Aplicação imediata](#aplicação-imediata)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

Toda nova peça de infraestrutura (runtime adicional, message broker, banco extra, VPS, gateway, novo serviço) traz custo total triplo: financeiro, cognitivo (curva de aprendizado, manutenção) e operacional (mais um ponto de falha). Em projeto solo mantido por doação, esse custo total compete diretamente com tempo gasto em features que servem cidadão.

O ROADMAP original da Wave 3 (escrito em abril/2026, pré-Wave 2) propunha múltiplas peças de infraestrutura herdadas da definição "Wave 3 — Inteligência":

- VPS Hostinger KVM 2 (R$59/mês) para serviços Go
- Extração de módulos para Go (Strangler Fig, ADR-007)
- NATS JetStream para domain events
- Apache AGE para análise de grafo
- Caddy como API Gateway
- API pública REST com webhooks, API keys, OpenAPI

A auditoria pré-Wave 3 (PR #106, 2026-05-13) revelou que **nenhuma dessas peças tinha justificativa empírica** no estado atual:

| Peça proposta | Justificativa empírica? | Realidade observada (2026-05-13) |
|---|---|---|
| VPS Hostinger | Não | Workers + Neon servem; latência mediana entre 57ms (`/api/health`) e 745ms (`/parlamentares` DB-heavy). |
| Módulos Go | Não | Stack TypeScript cobre 100% das features entregues até v0.2-final. Sem ponto de complexidade intratável por revisão semanal. |
| NATS JetStream | Não | Time = 1 pessoa. Sem comunicação assíncrona inter-serviço necessária. |
| Apache AGE | Não | Grafo pode ser computado em TypeScript puro + renderizado com `reactflow` no frontend. |
| Caddy API Gateway | Não | Workers já roteia. |
| API pública REST | Não | Zero forks, zero issues externas pedindo, zero contato direto solicitando. |

Esse padrão repete o erro observado em duas tentativas anteriores do projeto (Go monorepo, TypeScript hexagonal abandonado): **introduzir complexidade antes de necessidade**. Ambas foram abandonadas precisamente por over-engineering. Princípio 13 do CLAUDE.md (validação empírica) já endereçava o caso individual; este ADR escala o princípio para o nível arquitetural.

## Decisão

Toda nova peça de infraestrutura exige **três condições concorrentes** antes da adoção:

1. **Métrica observada em produção** apontando gargalo concreto (latência mensurada acima de threshold definido, custo em zona vermelha do ADR-017, frequência de incidentes documentada, volume de tráfego com origem identificada).
2. **Tentativa documentada de resolver dentro da infra atual** antes de adicionar peça nova. Stack atual: Cloudflare Workers + Neon Postgres + R2 (cache) + TypeScript. Antes de adicionar Y, provar que TypeScript/Postgres/Workers não resolvem.
3. **ADR específico** documentando o problema medido, alternativas dentro do stack atual consideradas, e custo total esperado (financeiro + cognitivo + manutenção) da nova peça.

Decisões sem evidência para os três pontos acima = **não fazer**. Não viram issues `wave-4+` como "compromisso futuro". Viram registro fechado neste ADR e em comentários de fechamento das issues correspondentes.

Quando evidência empírica surgir no futuro, **abrir issue nova naquele momento** com a evidência incluída. Backlog enxuto: issue aberta = ação planejada com base em evidência, não inventário de aspirações técnicas.

## Aplicação imediata

Issues fechadas como resultado deste ADR (sessão de refinamento pós-auditoria, 2026-05-13):

- API pública REST + ecossistema externo — issue #95
- Extração de módulos para Go + NATS + Apache AGE + VPS Hostinger — issue #97
- Mobile + i18n (parte de "Expansão de produto") — issue #99 (assembleias estaduais sai para issue separada se demanda surgir)

Issues reescritas com escopo alinhado:

- Grafo legislativo: pivotada para reactflow no frontend — issue #96

Issues mantidas em `wave-4+` por evolução natural legítima:

- NLP avançado de classificação — Wave 3.1 usa keywords L2; NLP é evolução real se demanda surgir
- Brasil a Vera Labs (L4) — evolução de plataforma analítica, justificável quando volume crescer
- Integração TSE completa — Wave 3.2 entrega subset 2022; expansão (bens, anos anteriores) é evolução natural

## Alternativas Consideradas

### Permitir infra nova com base em "boas práticas da indústria"

**Prós**: alinha com discurso de mercado; facilita explicar pra recrutadores em entrevista.

**Contras**: projeto solo sem budget de complexidade. Boas práticas industriais são para times de 5-50 pessoas, não para um. Adoção mimética força over-engineering.

**Veredicto**: descartado.

### Permitir infra nova com base em aprendizado pessoal

**Prós**: portfolio cresce com diversidade técnica.

**Contras**: Brasil a Vera é projeto cívico com responsabilidade pública — não pode ser laboratório de experimentação. Aprendizado pessoal vai para projetos paralelos.

**Veredicto**: descartado.

### Princípio implícito (não documentar em ADR)

**Prós**: menos documentação, repo mais leve.

**Contras**: princípio implícito vira inconsistente sob pressão (saudade de tech, novidade de release de framework, sugestão externa). Documentar protege decisão futura.

**Veredicto**: descartado.

## Consequências

### Positivas

- Custo operacional fica previsível e baixo (manutenção em zona verde/amarela do ADR-017).
- Foco em features que servem cidadão real, não em modernização aspiracional.
- Documentação histórica protege a decisão contra pressão futura.
- Escala o princípio 13 (validação empírica) do nível individual (cache/runtime claims) para o nível arquitetural.
- Backlog enxuto: issue aberta significa ação planejada com base em evidência, não inventário aspiracional.

### Negativas

- Algumas peças "interessantes tecnicamente" ficam fora indefinidamente.
- Pode dar impressão de "projeto conservador" para alguém que valoriza variedade tecnológica.
- Operador precisa resistir à tentação de modernizar por modernizar.
- Issue de feature interessante pode parecer "rejeitada" para contribuidor externo — mitigar com comentário rico de fechamento que explica gate (3 condições concorrentes), não veto absoluto.

### Neutras

- Decisão correlata da mesma sessão: **reactflow no frontend para grafo legislativo**. Cálculo de relações em TypeScript server-side + renderização interativa em React elimina necessidade de Apache AGE / NetworkX, sem perder a feature.

## Referências

- [ADR-007](007-monolith-first-strategy.md) — Monolith-first strategy (este ADR endurece a posição)
- [ADR-017](017-budget-mensal-observabilidade.md) — Budget mensal e observabilidade
- [Princípio 13 do CLAUDE.md](../../../CLAUDE.md) — Validação empírica antes de implementação
- [PRODUCT-VISION.md](../../product/PRODUCT-VISION.md) — "custo operacional próximo de zero por design"
- Auditoria pré-Wave 3 (PR #106, 2026-05-13)
- Sessão de refinamento pós-auditoria (este ADR + fechamento de issues correlatas)
