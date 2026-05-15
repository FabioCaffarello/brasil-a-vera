# Roadmap

> Brasil a Vera · Produto · v0.4.0
> Última atualização: 2026-05-15 (Sprint 4.0 concluída — fundação do Design System)
> Status: accepted

---

> **Nota histórica — renumeração de Waves em 2026-05-15**
>
> Originalmente, a Wave 4 era "Open Ground" — backlog sem plano contratual
> (API pública avançada, arquitetura distribuída em Go, TSE completo,
> Brasil a Vera Labs etc.). Após o fechamento da Sprint 3.2
> (`v0.3.2-distribution`), o operador decidiu reposicionar a Wave 4 para
> **"Design System & Frontend de Excelência"** com 6 sprints (4.0–4.6) —
> uma resposta a protótipo de design parceiro que demandou uma fase
> dedicada a elevar a qualidade visual e arquitetura do frontend sem
> features novas de domínio.
>
> Consequência:
>
> - **Wave 4** passou a ser a fase de Design System (este documento, abaixo).
> - **Wave 5 — Open Ground** absorveu o backlog que antes vivia na Wave 4.
> - **Sprints 3.3 e 3.4** (TSE, API pública REST, índice de coerência,
>   grafo) permanecem como `planejada` dentro da Wave 3, **pausadas em
>   2026-05-15** pendentes reavaliação ao final da Wave 4. Quando
>   reativadas, podem ser executadas como Sprints 3.3/3.4 ou migradas
>   formalmente para Wave 5 — decisão informada por evidência empírica
>   de uso pós-Wave 4.
> - O label de issues `wave-4+` será renomeado para `wave-5+` ao final
>   da Sprint 4.0 (não no PR de abertura — espera-se o ciclo de
>   fechamento da sprint pra evitar churn duplo no GitHub).
>
> Razão da decisão registrada em [prompt mestre Wave 4](#wave-4--design-system--frontend-de-excelência)
> abaixo, no [ADR-021](../architecture/ADR/021-design-system-shadcn-curado.md)
> e no [ADR-022](../architecture/ADR/022-clerk-para-autenticacao.md).

---

## Sumário

- [Estratégia de Waves](#estratégia-de-waves)
- [Wave 0 — Fundação](#wave-0--fundação)
- [Wave 1 — MVP Público](#wave-1--mvp-público)
- [Wave 2 — Profundidade](#wave-2--profundidade)
- [Wave 3 — Profundidade Cívica Acessível](#wave-3--profundidade-cívica-acessível)
- [Wave 4 — Design System & Frontend de Excelência](#wave-4--design-system--frontend-de-excelência)
- [Wave 5 — Open Ground](#wave-5--open-ground)
- [Dependências entre Waves](#dependências-entre-waves)

---

## Estratégia de Waves

O roadmap segue **waves incrementais**, onde cada wave entrega valor autónomo e valida hipóteses antes de avançar. Nenhuma wave depende do sucesso comercial das anteriores.

```mermaid
gantt
    title Roadmap Brasil a Vera
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y

    section Wave 0
    Fundação           :w0, 2026-05-01, 8w

    section Wave 1
    MVP Público        :w1, after w0, 10w

    section Wave 2
    Profundidade       :w2, after w1, 12w

    section Wave 3
    Profundidade Cívica Acessível :w3, after w2, 8w

    section Wave 4
    Design System & Frontend de Excelência :w4, after w3, 6w

    section Wave 5
    Open Ground        :w5, after w4, 2027-12-31
```

| Wave | Nome | Personas Atendidas | Duração Estimada |
|------|------|--------------------|------------------|
| 0 | Fundação | Nenhuma (infraestrutura) | 6-8 semanas |
| 1 | MVP Público | Cidadão, Jornalista | 8-10 semanas |
| 2 | Profundidade | Todos | 10-12 semanas |
| 3 | Profundidade Cívica Acessível | Cidadão, Jornalista, Pesquisador, Desenvolvedor | 14-20 semanas (5 sprints + 1 micro-wave); 3.3/3.4 pausados em 2026-05-15 |
| 4 | Design System & Frontend de Excelência | Todos | 6 sprints (4.0–4.6) |
| 5 | Open Ground | (definido após Wave 4) | Backlog sem plano contratual |

---

## Wave 0 — Fundação

> **Pergunta validada**: "Conseguimos ingerir, normalizar e servir dados legislativos de forma confiável?"

### Escopo

- Scripts TypeScript de ingestão: Câmara API + Senado API (executados via GitHub Actions)
- Modelo de domínio: bounded contexts core (Parlamentares, Proposições, Votações, Gastos) como módulos TypeScript
- PostgreSQL (Neon free tier) com schema por bounded context
- Migrations SQL puras em `src/shared/db/migrations/`
- Estrutura de módulos com Biome `noRestrictedImports` bloqueando imports cross-module
- API interna (Next.js Route Handlers, não pública) para validação
- CI/CD básico (Biome CI, Vitest, build Next.js) com pre-commit via Husky
- Trust Metadata como shared kernel implementado em `src/shared/trust/`

### Critérios de Done

- [ ] Pipeline da Câmara ingere 100% dos deputados da legislatura atual
- [ ] Pipeline da Câmara ingere votações nominais dos últimos 2 anos
- [ ] Pipeline da Câmara ingere gastos CEAP dos últimos 12 meses
- [ ] Pipeline do Senado ingere senadores em exercício
- [ ] Pipeline do Senado ingere votações do último ano
- [ ] Todos os registros persistidos com `trust_level: L1` e `source_url`
- [ ] Biome `noRestrictedImports` bloqueando imports cross-module no CI
- [ ] Husky pre-commit executando `biome check` nos arquivos staged
- [ ] Scripts de ingestão rodando via GitHub Actions cron
- [ ] `npm run dev` sobe o Next.js monolito conectado ao PostgreSQL
- [ ] Cobertura de testes > 70% no domínio
- [ ] Reconciliação manual confirma dados vs. fonte oficial

### Entregáveis de Arquitetura

- ADRs implementados (ver [ADRs](../architecture/ADR/))
- Monorepo estruturado conforme [ADR-001](../architecture/ADR/001-monorepo-strategy.md)
- Monolito Next.js modular conforme [ADR-007](../architecture/ADR/007-monolith-first-strategy.md)
- Clean Architecture em cada módulo conforme [ADR-002](../architecture/ADR/002-backend-language-and-framework.md)

---

## Wave 1 — MVP Público

> **Pergunta validada**: "O cidadão consegue encontrar seu parlamentar e entender o que ele faz?"
>
> **Pergunta-chave do MVP**: "O que meu deputado/senador anda fazendo?"

### Escopo

- Next.js monolito (ver [ADR-006](../architecture/ADR/006-frontend-stack.md)) — frontend SSR/SSG + API Route Handlers
- Página 360° do parlamentar (ver [Parlamentar 360°](../features/PARLAMENTAR-360.md))
- Página da proposição (tipo, ementa, tramitação, votos)
- Busca unificada (ver [Busca](../features/SEARCH.md))
- Pares contraditórios básicos (apenas verbos inequívocos)
- Top 5 parlamentares com maior afinidade de voto (SQL simples — GROUP BY + COUNT)
- Compartilhamento social com cards OG
- Export CSV básico
- Deploy em Cloudflare Workers via OpenNext (free tier)

### Critérios de Done

- [ ] Página 360° funcional para todos os deputados e senadores
- [ ] Busca por nome, proposição e tema retorna resultados em < 500ms
- [ ] Pares contraditórios exibidos com contexto temporal
- [ ] Trust level renderizado em toda a UI (badges L1/L2)
- [ ] Cards OG dinâmicos por parlamentar
- [ ] Export CSV com `trust_level` e `source_url` por linha
- [ ] WCAG 2.1 AA em todas as páginas
- [ ] Performance: LCP < 2.5s em 3G, CLS < 0.1
- [ ] 5.000 usuários ativos mensais (target)

### Personas atendidas

- **Cidadão Consciente**: página 360°, busca simples, compartilhamento
- **Jornalista Investigativo**: busca avançada, export, página de proposição

---

## Wave 2 — Profundidade

> **Status global**: ✅ **Wave 2 inteira concluída em 2026-05-13** com tag `v0.2-final`.
> As 3 sub-waves entregues: 2.0 (`v0.2.0-foundation`), 2.1 (`v0.2.1-depth`, com micro-wave 2.1.1 de fechamento de ressalvas), 2.2 mínima (`v0.2.2-distribution`).
> Próximo passo: Wave 3 — Profundidade Cívica Acessível.

> **Pergunta validada**: "Cidadãos engajados e jornalistas usam a plataforma como ferramenta de análise, não só consulta?"

A Wave 2 é dividida em três sub-waves entregáveis. Cada sub-wave tem tag de release própria e pode ser parada com algo concreto entregue.

### Wave 2.0 — Foundation Hardening

> **Tag de release**: `v0.2.0-foundation`
> **Status**: ✅ Concluída em 2026-05-12 com 2 ressalvas registradas (ver Critérios de Done abaixo)

**Por que primeiro**: a infraestrutura estabelecida na pré-Wave 2 (ADRs 016, 017, 018 + princípios 8-12 do CLAUDE.md) precisa ser implementada antes de qualquer feature nova. Sem cache, SSG e observabilidade, cada feature adicional ataca o budget direto. Esta sub-wave também consolida os safety nets que faltavam quando o incidente do Pool singleton aconteceu.

#### Escopo

**Infra de cache e SSG (princípios 8 e 9):**

- Módulo `src/lib/cache.ts` com TTLs do ADR-018 (issue #41)
- Migração de páginas de detalhe para SSG + `revalidate` periódico (issue #42)
- Webhook de revalidação pós-ingestão (issue #43)

**Tríade de observabilidade:**

- Endpoint `/api/stats` admin-only — visibilidade do banco (issue #38)
- Script GitHub Actions de poll de billing Neon — visibilidade do custo (issue #40)
- Monitoramento de jobs de ingestão GitHub Actions — visibilidade dos pipelines (issue #30)

**Safety nets:**

- Alerta quando endpoint do Senado atinge limit fixo (issue #21)
- Smoke test pós-deploy contra Workers + Neon (issue #33)

**Base de testes para a Wave 2.1:**

- Testes integrados de queries com testcontainers (issue #22)

**Débito documental:**

- ADR-010 — UUID v7 como chave primária (issue #23)
- ADR-013 — Schema por bounded context no Postgres (issue #24)
- ADR-015 — Split de driver Neon por runtime (issue #34)

**Recorrente:**

- Revisão trimestral de custo (issue #39)

#### Critérios de Done

- [ ] 30 requests concorrentes em rotas de detalhe servem em < 100ms (média, com cache quente) — **ressalva**: nunca medido formalmente. Cache de edge implementado ([ADR-018](../architecture/ADR/018-cache-edge-app.md)), arquitetura suporta. Falta benchmark empírico — fica como item de operação contínua, não bloqueia entrega.
- [ ] CU-hours mensal projetado < 50 (zona verde do [ADR-017](../architecture/ADR/017-budget-mensal-observabilidade.md)) — **parcial**: 46.98 h/mês observado (< 50 ✓), mas custo projetado entrou em zona AMARELA ($7.52, threshold $5-15) por compute em testes/dev. Acompanhamento contínuo em #39.
- [x] `/api/stats` retornando contagens, tamanho do banco, última ingestão por tipo (issue #38)
- [ ] Webhook de `revalidate` validado em produção (1 deploy de ingestão dispara `revalidatePath`) — **ressalva**: bloqueado por #58 (R2 incremental cache) que migra para Wave 3+. Issue #43 fica aberta para Wave 3. Revalidação manual via redeploy é alternativa viável até lá.
- [x] Script de poll Neon rodando diariamente com alerta em zona amarela/vermelha (issue #40, PR #55)
- [x] Monitoramento de jobs de ingestão notifica falhas em < 1h (issue #30)
- [x] Smoke test pós-deploy bloqueando rollout em caso de regressão (issue #33)
- [x] Suite de testes integrados com testcontainers cobrindo queries de domínio (issue #22, PR #63) — **parcial**: cobre módulo `parlamentares` (8 funções, 11 testes). Issues #64-#67 estendem para `proposicoes`, `votacoes`, `stats+busca`, `coerencia` em Wave 2.1.
- [x] Três ADRs de débito documental publicados (010, 013, 015) — issues #23, #24, #34 fechadas no Batch D

### Wave 2.1 — Domain Depth

> **Tag de release**: `v0.2.1-depth`
> **Status**: ✅ Concluída em 2026-05-13. Ressalvas operacionais e de domínio fechadas pela micro-wave 2.1.1 (PRs #81 / #74 → #82 / #77 → #84). Senado de alinhamento permanece bloqueado por falta de API pública — tracking em #83.
> **Duração estimada**: 4-6 semanas

**Por que segundo**: com infra hardened, cada feature de domínio herda otimização automaticamente. Aqui o produto ganha narrativa cívica — não só mostra dados isolados, mas tece a história legislativa.

#### Escopo

- **Tramitação de proposições**: ingestão e UI da história completa de cada PL/PEC/MPV. Schema com `descricao_resumida` (≤ 200 chars) + `descricao_completa` opcional. Cobertura: legislaturas 56 e 57 ([ADR-016](../architecture/ADR/016-cobertura-temporal-arquivamento.md)).
- **Alinhamento partidário**: % de fidelidade do parlamentar à bancada, visualizado em gráfico no perfil. Cálculo em batch noturno cacheado.
- **Comparativo entre parlamentares**: nova rota `/comparar?ids=X,Y[,Z]` para 2-3 parlamentares lado a lado (votos coincidentes, gastos, presenças, proposições).
- **Página de partido**: nova rota `/partidos/[sigla]` com bancada completa, fidelidade interna média, proposições por tema.

#### Critérios de Done

- [x] Visitante consegue contar uma história completa de um parlamentar em 60 segundos (perfil → tramitação de proposição → comparativo com colega de bancada) — stack completa entregue; validado por curl manual em prod pós-merge de cada ciclo
- [x] Tramitação cobre 100% das proposições das legislaturas 56 e 57 — ingestão Câmara + Senado em produção (PR #73). Filtro por casa corrigido em #74 / PR #82 para cobrir proposições compartilhadas Câmara↔Senado (antes filtro `source_url LIKE` ficava com último ingestor). Cobertura real cresce a cada run do cron semanal `ingestion-weekly.yml`.
- [x] Alinhamento partidário calculado para parlamentares com 50+ votações registradas — **parcial para Câmara**: código (PR #76) + ingestão de `orientacao_bancada` (#77 / PR #84) em produção. 56 rows × 18 votações × 8 partidos × 100% match com `parlamentar.partido_sigla`. UI renderiza percentual real (validado em 3 perfis amostrais). Cobertura cresce com cron de votações (4x/dia). **Senado bloqueado**: API não publica orientações — tracking em [#83](https://github.com/FabioCaffarello/brasil-a-vera/issues/83).
- [x] Página de comparativo funcional para qualquer combinação de 2-3 parlamentares (issue #47, PR #79) — validado em prod com 2 IDs, 3 IDs, 1 ID (erro inline), `bogus` (erro inline)
- [x] Página de partido funcional para todas as 20+ siglas ativas (issue #48, PR #78) — SSG pré-gera todas as siglas no build; validado em prod
- [x] Budget Neon segue em zona verde ou amarela controlada — **parcial**: zona AMARELA observada ($7.52, threshold $5-15 do ADR-017). Abaixo do limiar vermelho ($15) — "amarela controlada" cabe. Acompanhamento contínuo em #39.
- [x] Storage do banco < 1 GB — ~46.86 MB observado (último `/api/stats`); folga de 20x

### Wave 2.2 — Distribution & Polish

> **Tag de release**: `v0.2.2-distribution` (sub-escopo mínimo entregue em 2026-05-13)
> **Status**: ✅ **Mínima concluída** (3/5 critérios). RSS e Parquet/R2 ficam para uma Wave 2.2 completa, se valer o esforço.
> **Duração estimada original**: 2-3 semanas
> **Caráter**: opcional — entra apenas se Waves 2.0 e 2.1 fecharam sem queimar o operador e o budget estiver em zona verde. Em 2026-05-13 o budget estava em zona amarela controlada ($7.52, threshold $5-15 do ADR-017) — operador escolheu entregar o subset mínimo de distribuição (OG + /docs + PRODUCT-VISION) sem inflar escopo.

**Por que último e opcional**: distribuição e refinamento são multiplicadores de alcance, mas não desbloqueiam funcionalidade nova. Melhor parar 2.1 entregue do que iniciar 2.2 cansado.

#### Escopo

- OpenGraph dinâmico em todas as páginas (compartilhamento social com prévia rica) — **entregue**
- Newsletter/RSS de proposições e votações relevantes — adiado
- Bulk export em Parquet via R2 (formato amigo de DuckDB, Pandas) — adiado
- Página estática de documentação para desenvolvedores curiosos — **entregue**
- Atualização do PRODUCT-VISION com aprendizados das Waves 1 e 2 (issue #32) — **entregue**

#### Critérios de Done

- [x] Compartilhamento de qualquer URL em rede social gera prévia com OG dinâmico — PR #86 (fallback global + dinâmicos próprios em parlamentar / proposição / votação / partido)
- [ ] RSS feed publicado e validado em pelo menos 2 leitores — **adiado** para Wave 2.2 completa
- [ ] Bulk export em Parquet disponível no R2 — **adiado** para Wave 2.2 completa
- [x] Página `/docs` pública com guia de uso — PR #87 (SSG, sem touch DB)
- [x] PRODUCT-VISION atualizado com aprendizados de Waves 1 e 2 — PR #88 / issue #32

### Fora da Wave 2 — adiado para Wave 3 ou posterior

Por decisão consciente, o escopo abaixo não entra na Wave 2. A razão é dupla: investimento de engenharia desproporcional ao orçamento solo e ao retorno em curto prazo, e dependência de infraestrutura adicional (auth, rate limiting, gestão de contas) que abre dimensão de produto significativa.

- API pública REST com OpenAPI, rate limiting, API keys
- Webhooks para desenvolvedores terceiros
- Alertas push/email por parlamentar ou tema (exige gestão de contas de usuário, LGPD)
- Integração TSE completa (financiamento eleitoral, doações, bens) — escopo grande o suficiente para wave dedicada
- Targets de adoção (50k MAU, 10 API keys, 5 citações em mídia) — viram OKRs de Wave 3, não critérios de Done de Wave 2

---

## Wave 3 — Profundidade Cívica Acessível

> **Pergunta validada**: "Cidadão e jornalista conseguem responder perguntas cívicas concretas (coerência por tema, financiamento eleitoral) usando a plataforma sem expedição arqueológica?"

A Wave 3 transforma os dados estruturados acumulados nas Waves 1 e 2 em narrativa cívica acessível. Reescrita em 2026-05-13 (Sprint 3.0 / `v0.3.0-stable`) em 5 sprints incrementais — ordem: estabilização e honestidade → narrativa cívica → quick wins de distribuição → plataforma para devs → inteligência analítica. Cada sprint tem tag de release própria.

A Wave 3 **deliberadamente recorta escopo** — API pública REST, grafo legislativo, NLP avançado, extração de módulos Go, NATS JetStream e integração TSE completa migram para a Wave 4 (open ground). Stack permanente reafirmada em [ADR-020](../architecture/ADR/020-permanencia-monolito-typescript.md): TypeScript/Next.js/Neon/Cloudflare Workers, sem multi-runtime. Razão: nenhuma das peças propostas teve justificativa empírica, e cada uma dobraria o esforço da Wave inteira sem ganho proporcional pra cidadão. Ver [Fora da Wave 3](#fora-da-wave-3--adiado-para-wave-4) abaixo.

### Wave 3.0 — Estabilização & Honestidade

> **Tag de release**: `v0.3.0-stable`
> **Status**: ✅ Concluída em 2026-05-13
> **Duração**: 1 dia (escopo cirúrgico)

**Por que primeiro**: o produto pós-Wave 2 tinha 3 seções "honestas mas vazias" em todos os 721 perfis (pares contraditórios, top 5 afinidade, alinhamento à bancada), OG image vazando `localhost:3000` em todas as URLs sociais, e ressalvas operacionais não-fechadas. Antes de adicionar feature nova, o produto precisava estar em estado "sem vergonha de mostrar a um jornalista".

#### Escopo entregue

- **Bugs visíveis em produção** (Bloco 1): OG `localhost:3000` corrigido via `metadataBase`; auditoria do `db:migrate` automático + guarda em vitest; `/votacoes/[id]` ratificada como dynamic intencional (fechou #59); audit de triggers + concurrency dos 6 workflows + `WORKFLOWS.md` (fechou #69)
- **Auditoria de exports** (Tarefa 2): 4 endpoints CSV + `/api/stats` + busca empíricamente validados em prod; suite de regressão integration (12 + 4 testes); **truncagem honesta** via headers `X-Total-Count` / `X-Returned-Count` / `X-Truncated`
- **Diagnóstico de cobertura `orientacao_bancada`** (Tarefa 3): caminho (c) com nuance confirmado — 94.74% sobre nominais Câmara (denominador correto), não 1.21% sobre total. Senado bloqueado por #83. Script `ingestion/ops/diagnose-orientacoes.ts` permanece para revalidação periódica
- **Copy honesto em empty states** (Tarefa 4 + 3 finalização): zero ocorrências de "Pode ser que faltem dados…" em rotas públicas; copy refinado em ParesContraditorios, Top5Afinidade (disclaimer visível), AlinhamentoBancada (diferenciado por casa), FidelidadeMediaBlock, TramitacaoTimeline
- **Tooltip L1-L4** (Tarefa 5.1): acessível (hover/tap/focus, Esc, click fora), link âncora `/#piramide-confianca`
- **QA mobile** (Tarefa 5.2/5.3): Lighthouse mobile nas 6 rotas (Perf 94-99, A11y 93-100, CLS=0); tap targets ≥44px em filtros e busca

#### Critérios de Done — atendidos

- [x] Bugs OG/migrate/votacoes/workflows fechados; PRs #108-#110 mergeados
- [x] Auditoria de exports completa com tabela markdown + suite de regressão CI (PR #111)
- [x] Truncagem honesta implementada e validada em prod (X-Truncated emitido corretamente)
- [x] Diagnóstico orientação fechado com caminho técnico documentado (PR #113)
- [x] Grep `[pP]ode ser que` em src/ retorna 0 ocorrências
- [x] Lighthouse mobile rodado nas 6 rotas; sem regressão a11y
- [x] Tag `v0.3.0-stable` publicada
- [x] Budget Neon: zona AMARELA controlada (51.28 MB storage; estimativa $7.52 — abaixo do limiar vermelho $15)

#### Issues abertas pelo sprint (carregadas adiante)

- [#114](https://github.com/FabioCaffarello/brasil-a-vera/issues/114) — LCP > 2.5s em `/`, `/parlamentares`, `/partidos/[sigla]` (perf, wave-3+ → Sprint 3.1)

### Wave 3.0.5 — Honestidade pós-3.0 (recalibragem top 5 + auto-fetch vinculação)

> **Tag de release**: `v0.3.0.5-honest`
> **Status**: ✅ Concluída em 2026-05-15
> **Duração real**: ~1 dia (escopo recalibrado durante o sprint)

**Por que aqui**: dois empty states do Sprint 3.0 ficaram com copy honesto mas a feature continua "anêmica" — pares contraditórios cobre só verbos inequívocos (poucas ementas qualificam) e top 5 afinidade exibe 100% com 5 votações em comum (estatisticamente frágil).

**Redirecionamento durante o sprint** (Opção D do checkpoint): diagnóstico empírico mostrou que **NLP não era o gargalo** de pares contraditórios — gargalo real era vinculação votação→proposição (98% das nominais Câmara sem `proposicao_id` apontavam para proposições fora da janela de ingestão). Escopo reordenado para atacar gargalo real antes de refinar classificador.

#### Escopo entregue

**Bloco 1 — Recalibragem top 5 afinidade** (PR #117):

- Quórum mínimo de votações em comum: 5 → **20** (default)
- Janela temporal: **últimos 12 meses**
- `ORDER BY` por percentual desc, total como desempate (não mais coincidentes absolutos)
- Constantes `TOP5_QUORUM_MINIMO` e `TOP5_JANELA_MESES` exportadas — disclaimer sincronizado com cálculo

**Blocos 2/3/4 — Diagnóstico + auto-fetch + copy** (PR #121):

- Script `diagnose-3-0-5-vinculacao.ts` classifica gap de vinculação em 4 causas (a/b/c/d) — empírico mostrou 100% causa (a)
- **Auto-fetch reverso no backfill**: quando referência aponta para proposição ausente, dispara ingestão inline. Safeguard de 50 proposições/execução
- Split `proposicoes-core.ts` (puro) vs `proposicoes.ts` (entry-point) — bug descoberto durante implementação (import disparava ingest completo)
- `ORDER BY` com prioridade para nominais no backfill — garante safeguard consumido em votações user-facing
- Copy do empty state `ParesContraditorios` atualizado para refletir vinculação completa e princípio ADR-019

#### Critérios de Done — atendidos

- [x] Top 5 afinidade default: quórum 20 + janela 12m + ORDER BY %; falsos 100% caíram de 18.4% para 5.3%
- [x] Vinculação votação→proposição Câmara: **20/20 → 0/0** nominais sem `proposicao_id`
- [x] Tests integration cobrindo nova regra de top 5 (quórum filtro, janela temporal, desempate)
- [x] Scripts de diagnose (`baseline` + `vinculacao`) permanecem como ferramenta de revalidação periódica
- [x] Storage Neon mantido em zona AMARELA controlada (~200 proposições novas via auto-fetch)

#### Issues abertas pelo sprint

- Nenhuma issue nova aberta — escopo cirúrgico fechou tudo dentro do PR.

#### Decisão registrada

**NLP do classificador NÃO foi expandido** — princípio ADR-019 (sem gargalo empírico) protege contra expansão sem necessidade. Vocabulário atual cobre apenas verbos inequívocos; quando aparecer gargalo medido (ementas classificáveis mas ficando NÃO_CLASSIFICADA por verbos secundários), reabrir discussão com dados.

### Wave 3.1 — Narrativa Cívica & Frontend

> **Tag de release**: `v0.3.1-civic`
> **Status**: ✅ Concluída em 2026-05-15
> **Duração real**: ~1 dia (escopo cirúrgico)

**Por que segundo**: o cidadão que chega à plataforma sem nome em mente não sabe por onde começar. Esta sub-wave adiciona portas de entrada narrativas (não só "buscar X") e ajusta tipografia/espaçamento para destravar legibilidade.

#### Escopo entregue

- **Design tokens** (Tarefa 4.A, PR #124): paleta primária azul-marinho institucional via `@theme inline` em Tailwind v4; `docs/design/DESIGN-TOKENS.md` documenta princípios e variantes consideradas
- **Hierarquia do perfil 360°** (Tarefa 3, PR #125): refactor em 2 tiers — Tier 1 (ação legislativa) acima da dobra, Tier 3 (análises comparativas) em seção secundária com separador. Reflete cobertura empírica
- **Rota `/o-meu-parlamentar`** (Tarefa 1, PR #126): entrada cívica em 3 estados (form UF → autocomplete município → cards de representantes); dataset IBGE inline (5.571 municípios, 27 UFs); pedagogia explícita ("Congresso é representação estadual, não municipal")
- **Cards narrativos na home** (Tarefa 2, PR #127): 3 cards (Quem representa seu estado / Votações da semana / Plataforma em números) com `getPublicStats` + `getVotacoesRecentes`; fallback honesto 7d → 30d; lucide-react adicionado
- **Refinement aplicado** (Tarefa 4.B, PR #128): CTAs principais e focus rings migrados para `primary-700/500`; `EmptyState` component novo aplicado em listagens
- **Audit de tooltips L1-L4** (Tarefa 5, PR #129): cobertura já completa (10 usos de `TrustBadge` em 8 arquivos); refinements de link primary + aria-label + focus ring
- **QA mobile aprofundado** (Tarefa 6, PR #130): Lighthouse em 15 rotas; 2 fixes a11y (`text-zinc-500` dark mode contrast + `<dl>` aninhada); LCP > 2.5s expandido em #114

#### Critérios de Done — atendidos

- [x] Home tem **3 cards** de entrada narrativa, cada um linkando para fluxo cívico concreto
- [x] `/o-meu-parlamentar` funcional para entrada por estado/município (decisão de escopo: sem CEP)
- [ ] LCP < 2.5s — **não atingido**: 7 rotas ainda > 2.5s. Dependência cristalizada na #114: requer R2 incremental cache (#58, blocked). Documentado como carryover
- [x] CLS = 0 em todas as 15 rotas auditadas (zero regressão)
- [x] A11y mantido — 2 violações detectadas pelo audit foram corrigidas; pós-deploy esperar 100 em todas
- [x] Tabela QA mobile completa no PR #130

#### Issues abertas pelo sprint (carregadas adiante)

- [#114](https://github.com/FabioCaffarello/brasil-a-vera/issues/114) — LCP > 2.5s em 7 rotas (ampliado de 3 para 7); bloqueado por #58 (R2 cache)

#### Decisão registrada

**Modo escuro mantido** — implementado em todo o codebase desde Waves anteriores. Custo de remover > manter. Refinement aplicado em ambos os modos.

### Wave 3.2 — Quick wins de distribuição

> **Tag de release**: `v0.3.2-distribution`
> **Status**: ✅ Concluída em 2026-05-15. 4 PRs entregues + fechamento (#137).
> **Duração real**: 1 dia (cirúrgico — 4 PRs sequenciais)

**Por que terceiro**: feature de produto consolidada (3.0 + 3.0.5 + 3.1), agora dá pra distribuir. Itens leves de descoberta orgânica que multiplicam alcance sem demandar infra nova.

#### Escopo entregue

- OG dinâmico expandido para 5 listagens (home com contagem L2, /parlamentares, /proposicoes, /votacoes, /o-meu-parlamentar). Entidades já tinham OG próprio na Wave 3.0 — agora 9 cenários totais com hashes únicos garantidos por smoke probe.
- `/docs` pública reescrita em 5 páginas pedagógicas com sidebar sticky e active state: hub, pirâmide-de-confianca, como-ler-um-perfil, glossario, fontes.
- RSS 2.0 segmentado em ~85 feeds (1 global + 2 por casa + 27 por UF + ~25 por partido + ~30 por tema) com index human-readable em `/feed` e discovery via `metadata.alternates.types`.
- Smoke expandido com 4 probes (`og-hash-uniqueness`, `rss-xml-valid`, `rss-discovery`, `docs-anchors`) para regressões silenciosas que status HTTP não detecta.

#### Critérios de Done

- [x] OG dinâmico cobre ≥ 5 cenários (home, parlamentar, proposição, votação, partido) — **superado**: 9 cenários (5 listagens + 4 entidades). Probe `og-hash-uniqueness` (PR #136) garante via SHA-256 que cada rota tem render próprio.
- [x] `/docs` pública indexável, com explicação L1/L2/L3, fontes, cadência — 5 páginas em rotas explícitas (decisão C do plano), conteúdo derivado de `TRUST-PYRAMID.md`/`LEGISLATIVE-PROCESS.md`/`DATA-SOURCES.md`. Probe `docs-anchors` cobre regressão silenciosa de conteúdo pedagógico removido.
- [x] RSS validado **estruturalmente** em xmllint + smoke probe (`rss-xml-valid` checa RSS 2.0 + atom:link rel=self + content-type) — **ressalva**: validação manual em Feedly/NetNewsWire ficou como QA follow-up pós-tag. Estrutural cobre o que regressão silenciosa quebraria.

#### Decisão registrada

**Corte: 594 feeds por parlamentar individual fora do escopo** (princípio ADR-019). RSS por parlamentar individual exige evidência empírica de demanda (assinaturas reais observadas em logs) antes de adicionar. Cobertura atual (~85 feeds) cobre os recortes cívicos mais úteis sem inflar build/runtime.

### Wave 3.3 — Plataforma para devs

> **Tag de release**: `v0.3.3-platform`
> **Status**: ⏸️ pausada em 2026-05-15 — reavaliação ao final da Wave 4
> **Duração estimada**: 3-4 semanas

**Por que pausada**: Sprint 3.2 fechou com produto cívico consolidado e o operador redirecionou foco para Wave 4 (Design System & Frontend de Excelência). Quando reativada, pode ser executada como 3.3 ou migrada formalmente para Wave 5 — decisão dependente de feedback empírico durante a Wave 4 (demanda real de devs/jornalistas por API REST, TSE etc.).

**Por que era quarta** (preservado para contexto): estabiliza API antes de adicionar análise pesada. Inclui TSE inicial (subset 2022) para devs/jornalistas começarem a usar a plataforma como base de pesquisa.

#### Escopo

- API pública REST documentada via OpenAPI (rotas públicas atuais formalizadas — `/parlamentares`, `/proposicoes`, `/votacoes` etc — sem auth/rate-limit ainda)
- Alertas configuráveis por parlamentar/tema (rota `/alertas` com inscrição via e-mail — exige fluxo mínimo de auth; aceitar trade-off de complexidade aqui)
- TSE inicial: schema `eleicoes` + ingestão TSE 2022 (subset doações para parlamentares em exercício)
- Rota `/parlamentares/[id]/financiamento` com agregados PF/PJ
- ADR para modelagem TSE (numeração a definir quando da implementação — o slot ADR-021 foi ocupado pelo Design System em 2026-05-15)

#### Critérios de Done

- [ ] OpenAPI.json publicado em `/api/openapi.json`, valida via Swagger Editor
- [ ] Alertas: usuário cria inscrição via e-mail, recebe notificação quando parlamentar X vota Y
- [ ] Schema `eleicoes` aplicado via auto-migrate sem regressão
- [ ] Matching parlamentar↔candidatura com taxa ≥ 80% (heurística nome+CPF+UF)
- [ ] `/parlamentares/[id]/financiamento` renderiza com empty state explícito para não-matched

### Wave 3.4 — Inteligência analítica

> **Tag de release**: `v0.3.4-insight`
> **Status**: ⏸️ pausada em 2026-05-15 — reavaliação ao final da Wave 4
> **Duração estimada**: 4-6 semanas

**Por que pausada**: mesmo redirecionamento que pausou a 3.3. A 3.4 era também a sub-wave mais ambiciosa da Wave 3 — reavivá-la sem demanda concreta vai contra ADR-019.

**Por que era última** (preservado para contexto): o item mais ambicioso da Wave 3. Implementado em TypeScript ([ADR-020](../architecture/ADR/020-permanencia-monolito-typescript.md)) eventualmente com Workers AI para NLP pesado. Análises de grafo grandes rodam em batch via GitHub Actions e materializam resultado no banco.

#### Escopo

- **Índice de coerência completo** (extende Motor da Wave 1; depende do refinamento NLP do 3.0.5)
- **Página `/coerencia`** com ranking nacional + filtro por casa/partido/tema
- **Página `/sobre/metodologia`** (transparência sobre coleta, cálculo, classificação por L1/L2/L3 + princípio 13)
- **Dashboards temáticos**: schema `temas` + classificação automática de ementa, rotas `/temas` e `/temas/[slug]`, componente "Como X votou em [Tema]" nos perfis
- **Grafo legislativo**: detecção de comunidades em batch (Louvain/Leiden em JS), métricas de centralidade. Renderização frontend com `reactflow` (issue #96)
- **Workers AI** (opcional, com gargalo medido): se NLP local for insuficiente, mover classificação pesada para Workers AI

#### Critérios de Done

- [ ] Rota `/coerencia` acessível com ranking funcional para parlamentares com dados suficientes
- [ ] 6 temas cobertos, ≥ 50 proposições classificadas por tema (amostra mínima)
- [ ] Grafo legislativo renderiza em produção para top 50 parlamentares (depois expansão)
- [ ] `/sobre/metodologia` cobre L1/L2/L3, fontes oficiais, cadência, política da pirâmide
- [ ] Budget Neon mantido em zona amarela controlada (storage cresce com batches materializados)
- [ ] Princípio 13 referenciado em `/sobre/metodologia` — auditabilidade

### Fora da Wave 3 — adiado para Wave 5+ (anteriormente Wave 4+)

Por decisão consciente, o escopo abaixo **não entra** na Wave 3. Cada item dobraria o esforço da Wave inteira sem ganho proporcional pra cidadão; alguns foram descartados por princípio empírico (ver [ADR-019](../architecture/ADR/019-disciplina-arquitetural-sem-gargalo.md)) e por permanência do monolito ([ADR-020](../architecture/ADR/020-permanencia-monolito-typescript.md)).

- **API pública REST avançada**: rate limiting com API keys, webhooks para terceiros, push notifications (gestão de contas + LGPD ampla)
- **Migração para arquitetura distribuída**: extração de módulos Go (~~[ADR-007](../architecture/ADR/007-monolith-first-strategy.md)~~ superseded por ADR-020), NATS JetStream, Apache AGE, VPS Hostinger
- **Integração TSE completa**: bens declarados, gastos de campanha completos, anos anteriores além de 2022
- **Expansão de produto**: mobile nativa, integração Telegram/WhatsApp, i18n, assembleias legislativas estaduais
- **Brasil a Vera Labs (L4)**: análises de impacto com curadoria especializada
- **Bulk Parquet via R2**: formato amigável a DuckDB/Pandas — adiado pela Wave 2.2

Cada bloco vira issue mestre rotulada `wave-4+` no rastreamento de issues (label será renomeada para `wave-5+` no fechamento da Sprint 4.0 — renumeração de Waves de 2026-05-15). Buscar com `gh issue list --label wave-4+`.

---

## Wave 4 — Design System & Frontend de Excelência

> **Pergunta validada**: "Conseguimos elevar a qualidade visual e arquitetural do frontend ao nível de showcase profissional sem comprometer custo, trust_level, SEO ou WCAG?"

A Wave 4 nasceu após a entrega da Sprint 3.2 (`v0.3.2-distribution`) em 2026-05-15. Um protótipo de design parceiro (stack incompatível: TanStack Start + Vite + chamadas client-side à API da Câmara + mock auth) trouxe linguagem visual premium dark-first com OKLCH, IA estruturada e fluxos completos. **Extraímos a linguagem visual e a IA; reconstruímos tudo em cima da nossa stack** (Next.js 16 + RSC + Drizzle + Neon + Cloudflare Workers) com design system próprio versionado, testável e adaptado aos tokens semânticos.

A Wave 4 é deliberadamente **sem features novas de domínio** — toda a lógica de queries em `src/lib/queries/`, ingestão em `ingestion/`, módulos `src/modules/` e `src/shared/` permanece intocada. Refatoração é estética e arquitetural-frontend; trust_level, SEO, cobertura WCAG e custo Neon não regridem.

Decisões arquiteturais que governam a Wave 4 ficam em:

- [ADR-021](../architecture/ADR/021-design-system-shadcn-curado.md) — Design System próprio com shadcn/ui curado
- [ADR-022](../architecture/ADR/022-clerk-para-autenticacao.md) — Clerk para autenticação na Sprint 4.5+

### Wave 4.0 — Fundação do Design System

> **Tag de release**: `v0.4.0-design-system-foundation`
> **Status**: ✅ Concluída em 2026-05-15
> **Duração real**: 1 dia (8 PRs sequenciais — escopo cirúrgico)

**Por que primeiro**: estabelecer tokens semânticos, theme provider e as primitivas essenciais antes de tocar em qualquer página de produto. Risco controlado — nada visual mudou na home/listagens. Primeiro consumer real foi `/dev/design` (PR 7).

#### PRs entregues

| PR | Conteúdo |
|---|---|
| [#138](https://github.com/FabioCaffarello/brasil-a-vera/pull/138) | ADRs e contrato (docs-only): ADR-021 (Design System & shadcn curado), ADR-022 (Clerk para auth), CLAUDE.md linha-pointer, ROADMAP renumerado (Wave 4 nova + Wave 5 Open Ground com nota histórica). |
| [#139](https://github.com/FabioCaffarello/brasil-a-vera/pull/139) | Tokens OKLCH dark + esqueleto `src/design-system/` + `src/lib/cn.ts` + WCAG re-audit (15 pares dark + 15 light + culori dev-time) + import-boundaries vitest + Biome override + nota OKLCH support. Diff zero provado byte-a-byte em `/docs.html`. |
| [#140](https://github.com/FabioCaffarello/brasil-a-vera/pull/140) | `components.json` + primitiva `button` (8 testes). Bundle delta 0 (não consumida ainda). |
| [#141](https://github.com/FabioCaffarello/brasil-a-vera/pull/141) | Tier 1 lote 1: `card` + `badge` + `skeleton` em 3 commits isolados (19 testes). |
| [#142](https://github.com/FabioCaffarello/brasil-a-vera/pull/142) | Tier 1 lote 2: `sonner` (toasts, D4 sem next-themes) + `dialog` (Radix com focus trap, Esc, aria-labelledby/describedby) em 2 commits (12 testes). |
| [#143](https://github.com/FabioCaffarello/brasil-a-vera/pull/143) | Tier 1 lote 3: `input` + `label` + `separator` + `tabs` em 4 commits isolados (26 testes incluindo keyboard nav ArrowRight). |
| [#144](https://github.com/FabioCaffarello/brasil-a-vera/pull/144) | Rota interna `/dev/design` consumindo as 10 primitivas + X-Robots-Tag via `next.config.ts` + probe smoke `dev-routes-noindex` (7 testes do helper). **Primeiro consumer real** — bundle delta JS +118kb raw / ~30kb gzipped confirma estimativa do ADR-021. |
| [#145](https://github.com/FabioCaffarello/brasil-a-vera/pull/145) | Este PR — fechamento (ROADMAP + release notes + banner + tag + label rename). |

#### Critérios de Done — atendidos

- [x] `npm run check`, `npm run ci`, `npm run test`, `npm run build`, `npm run cf:build` passam em cada PR
- [x] `/dev/design` renderiza todas as 10 primitivas Tier 1 sem erros em dark
- [x] Auditoria de contraste: todos os 30 pares funcionais texto-sobre-fundo passam WCAG AA (15 dark + 15 light), tabela em `WCAG-AUDIT.md`
- [x] Bundle delta medido por PR e registrado (zero em PRs 3-6 por tree-shake, +118kb raw / ~30kb gzipped no PR 7 com primeiro consumer real)
- [x] Build time mantido no baseline (~7-9s wall em PRs com build limpo)
- [x] Zero regressão visual em rotas existentes — provado byte-a-byte em `/docs.html` no PR 2 (35743 = 35743 após normalização de hashes)
- [x] Probe `dev-routes-noindex` no smoke valida `/dev/design` com `X-Robots-Tag: noindex` (header) + meta robots noindex (HTML)
- [x] Tag `v0.4.0-design-system-foundation` publicada (após merge deste PR)
- [x] Label `wave-4+` renomeada para `wave-5+` no GitHub (após merge deste PR — comando documentado nas release notes)

#### Decisões aplicadas durante a sprint

- **D1 → (a)**: Dark only no 4.0; light dormente; toggle dark/light fica para 4.1+.
- **D2 → (a)**: `components.json` aliases `ui → @/design-system/primitives`, `utils → @/lib/cn`.
- **D3 → (a1)**: Rota `/dev/design` em `src/app/dev/` (sem route group; nesting direto), `noindex` via meta + `X-Robots-Tag` header via `next.config.ts`, probe smoke validando ambos.
- **D4**: Sem `next-themes` no 4.0; Sonner com `theme="dark"` hardcoded. CLI instalou next-themes automaticamente — desinstalado no PR 5.
- **D5**: Clerk só como ADR-022; dep entra no PR da Sprint 4.1.
- **D6 → opção 2**: Wave 4 inteira é "Design System & Frontend de Excelência"; backlog antigo migrado para Wave 5 — Open Ground.
- **D7**: 8 PRs sequenciais mantidos.

#### Issues abertas pelo sprint (carregadas adiante)

- Nenhuma issue nova aberta pela sprint. Carryovers planejados para 4.1+:
  - **Toggle dark/light** com `next-themes` (Sprint 4.1)
  - **Inter font** (Sprint 4.1 junto com novo shell)
  - **`tw-animate-css`** para animações de Dialog/Tabs (decisão diferida — Sprint 4.1 ou 4.3 com base em uso real)
  - **Tokens `--color-secondary`/`--color-accent`/`--color-input`** (introduzir quando primitiva de input dedicada exigir, no Sprint 4.2+)

### Wave 4.1 — Refatoração do shell (layout + home + Clerk)

> **Tag de release**: integrar em `v0.4.x` (sem tag intermediária — sprints intermediárias só merge na main)
> **Status**: planejada
> **Duração estimada**: ~5 PRs

**Por que segundo**: trocar o shell (header, footer, home) e introduzir Clerk em ilha cliente isolada antes das listagens e perfis. Mantém tudo funcionando — só muda a camada visual.

#### Escopo

- Novo `src/components/site/navbar.tsx` com Clerk hooks (`<SignedIn>`, `<SignedOut>`, `<UserButton>`) em ilha cliente isolada
- Novo `src/components/site/footer.tsx`
- `src/app/layout.tsx` reescrito: tema dark default, fonte Inter (Geist Mono mantida para mono), Navbar/Footer compostos
- `src/app/page.tsx` (home) refeito: hero com copy "Você escolheu quem te representa…", grid de stats via `getPublicStats`, seção de features, seção de metodologia
- Setup Clerk: `@clerk/nextjs`, env vars (`.dev.vars` + Cloudflare Secrets), `<ClerkProvider>`, middleware protegendo `/minha-area/*` (sem rotas dependentes ainda)
- `next-themes` se decisão de produto autorizar toggle dark/light

#### Critérios de Done

- [ ] Rotas existentes (`/`, `/parlamentares`, etc.) continuam funcionando — apenas com novo shell visual
- [ ] Clerk integrado, sem rotas privadas ainda
- [ ] Lighthouse mobile do `/` ≥ 90 em performance, ≥ 100 em a11y
- [ ] Bundle client medido — `<UserButton />` lazy-loaded para usuário anônimo
- [ ] Evidência empírica de que Clerk free tier (50k MAU) suporta tráfego esperado registrada no PR (cross-ref do ADR-022)

### Wave 4.2 — Páginas de listagem (parlamentares, proposições, votações)

> **Tag de release**: integrar em `v0.4.x`
> **Status**: planejada

**Por que terceiro**: reskinning das 3 grandes listagens com o novo design system. Mantém queries e arquitetura RSC; troca componentes visuais.

#### Escopo

- `/parlamentares`: filtros (UF, partido, casa, busca) com primitivas do design system; cards com estética nova mas dados nossos; URL state preservado (filtros são GET)
- `/proposicoes` e `/proposicoes/[tipo]`: idem
- `/votacoes`: idem
- `components/parlamentar/parlamentar-card.tsx`, `components/proposicao/proposicao-card.tsx`, `components/votacao/votacao-card.tsx`: atualizados
- Componentes Tier 2 copiados conforme necessário (`popover`, `command` para typeahead se aparecer demanda)

#### Critérios de Done

- [ ] Páginas mantém SSG (cache de edge, ADR-018) — sem regressão de queries
- [ ] Smoke probes de listagem em `ingestion/ops/smoke.ts` continuam passando
- [ ] Filtros funcionais sem JavaScript no client (`<form method="get">` mantido onde aplicável)

### Wave 4.3 — Perfil 360° do parlamentar

> **Tag de release**: `v0.4.3-profile-premium`
> **Status**: planejada

**Por que quarto**: a página mais importante do site recebe o tratamento premium.

#### Escopo

- `/parlamentares/[id]`: novo header com foto, partido badge, redes sociais, gabinete
- Reorganização de seções (Votos Recentes, Alinhamento, Proposições, Gastos, Top 5 Afinidade, Pares Contraditórios) com `Card` + `Tabs` se reduzir scroll
- Disclaimer permanente para análises L3 mantido (componente `trust-badge.tsx`)
- Recharts adotado **apenas se** `getGastosResumo` já retornar dado mensal e gráfico comunicar melhor que tabela; caso contrário, manter tabular

#### Critérios de Done

- [ ] Ordem das seções respeita hierarquia documentada na Sprint 3.1 (cobertura empírica)
- [ ] Trust levels visíveis em todas as análises L3 (não removidos por estética)
- [ ] LCP ≤ 2.5s em 4G simulado
- [ ] Lighthouse mobile ≥ 95 em performance, ≥ 100 em a11y

### Wave 4.4 — Perfis de proposição, votação, partido + busca + comparar

> **Tag de release**: integrar em `v0.4.x`
> **Status**: planejada

Aplicação do design system às páginas restantes (proposição individual, votação individual, partido, busca, comparar). Padrão segue 4.2/4.3.

### Wave 4.5 — Minha área (autenticada)

> **Tag de release**: `v0.4.5-minha-area`
> **Status**: planejada — pré-requisito: definir o que persistir e tabela `usuario_acompanhamento`

**Por que aqui**: introduzir rotas privadas do protótipo do designer (Acompanhados, Alertas, Configurações) **apenas o que tem contrapartida no nosso domínio**. Se a sprint demandar nova tabela `usuario_acompanhamento`, abre-se ADR específico sobre persistência multi-tenant LGPD-aware antes do schema.

Decisão pendente para o início da Sprint 4.5: faz sentido executar agora ou esperar 4.6? Decisão tomada na entrada da sprint com base em evidência observada durante a Wave 4 (princípio ADR-019).

### Wave 4.6 — Polimento & observabilidade

> **Tag de release**: `v0.4.6-polish`
> **Status**: planejada

**Por que último**: revisão de animações, microinterações, focus rings, dark/light toggle (se decidido), página `/metodologia` se ainda não migrada de `/docs`, atualização dos OG images para o novo visual, smoke probes ampliados para validar visual regression básico (screenshot diff em headless — entra só se gargalo justificar; princípio ADR-019).

### Fora da Wave 4 — adiado para Wave 5

Tudo o que era backlog "Wave 4 — Open Ground" (API pública avançada, arquitetura distribuída, TSE completo, Brasil a Vera Labs, expansão multi-plataforma) ficou em [Wave 5 — Open Ground](#wave-5--open-ground).

---

## Wave 5 — Open Ground

> **Status**: plano contratual pendente — será reavaliado após a Wave 4 fechar com base em evidência empírica de uso (cidadão, jornalista, contribuidor) e custo operacional.

A Wave 5 é deliberadamente **open ground** — sem critérios de Done atribuídos antecipadamente. As decisões adiadas das Waves 2, 3 e 4 (e da definição "Wave 3 — Inteligência" anterior) ficam aqui como backlog explícito, rotuladas `wave-5+` no rastreamento de issues (label renomeada de `wave-4+` no fechamento da Sprint 4.0 — ver nota histórica no topo deste documento).

### Backlog (cada bullet é uma issue mestre com label `wave-5+`)

- **API pública e ecossistema externo** — REST + OpenAPI, API keys, rate limiting, webhooks, alertas push/email com gestão de contas LGPD-aware (era Wave 3.3 pausada + Wave 4 Open Ground original)
- **Plataforma analítica avançada** — grafo legislativo interativo, NLP de classificação de direção, detecção de comunidades, métricas de centralidade (era Wave 3.4 pausada)
- **Migração para arquitetura distribuída** — Go Strangler Fig, NATS JetStream, Apache AGE, VPS Hostinger (já descartado por ADR-020 e ADR-019; mantido na lista apenas como histórico até evidência empírica reabrir discussão)
- **Integração TSE completa** — bens declarados, gastos de campanha completos, anos anteriores além de 2022
- **Expansão de produto** — mobile nativa, integração com redes sociais (Telegram/WhatsApp), i18n, assembleias legislativas estaduais
- **Brasil a Vera Labs (L4)** — análises de impacto com curadoria especializada e disclaimers permanentes

Listar: `gh issue list --label wave-5+` (após renomeação na Sprint 4.0).

### Quando reavaliar Wave 5

Reavaliação acontece **após a Wave 4 fechar** (estimativa: 2026 Q4 / 2027 Q1) com 3 perguntas:

1. Existe demanda concreta de cidadão, jornalista ou desenvolvedor pelo backlog acima?
2. O custo operacional manteve-se em zona amarela controlada (ADR-017) durante as Waves 3 e 4?
3. Qual o ROI estimado por item do backlog frente ao esforço solo?

Sem essas respostas calibradas em evidência empírica, a Wave 5 permanece em modo backlog. Princípio 13 do CLAUDE.md em ação: planejamento espera dados, não inferência. ADR-019 aplica-se a qualquer infra nova do backlog Wave 5.

---

## Dependências entre Waves

```mermaid
graph LR
    W0["Wave 0<br/>Fundação"] --> W1["Wave 1<br/>MVP"]
    W1 --> W2["Wave 2<br/>Profundidade"]
    W2 --> W3["Wave 3<br/>Profundidade Cívica<br/>Acessível"]
    W3 --> W4["Wave 4<br/>Design System &<br/>Frontend de Excelência"]
    W4 --> W5["Wave 5<br/>Open Ground"]

    W0 -->|"PostgreSQL + Ingestão<br/>obrigatórios"| W1
    W1 -->|"Next.js monolito + busca<br/>obrigatórios"| W2
    W2 -->|"Motor de Coerência básico +<br/>Cache + SSG + Tramitação<br/>obrigatórios"| W3
    W3 -->|"Produto cívico consolidado<br/>(Sprint 3.2 fechada)"| W4
```

| Dependência | De | Para | Tipo |
|-------------|-----|------|------|
| PostgreSQL (Neon) + schemas | Wave 0 | Wave 1 | Obrigatória |
| Scripts de ingestão (GitHub Actions) | Wave 0 | Wave 1 | Obrigatória |
| Biome import boundaries + Husky pre-commit | Wave 0 | Wave 1 | Obrigatória |
| Next.js monolito (frontend + API) | Wave 1 | Wave 2 | Obrigatória |
| Busca unificada | Wave 1 | Wave 2 | Obrigatória |
| Motor de Coerência básico | Wave 1 | Wave 3.0 (Índice de Coerência Completo) | Obrigatória |
| Cache de edge + SSG | Wave 2.0 | Wave 3 | Obrigatória |
| Tramitação + alinhamento | Wave 2.1 | Wave 3.1 (dashboards temáticos) | Obrigatória |
| Orientação Câmara (`orientacao_bancada`) | Wave 2.1.1 | Wave 3.0 (Índice de Coerência) | Obrigatória |
| Produto cívico consolidado (`v0.3.2-distribution`) | Wave 3 (Sprints 3.0–3.2) | Wave 4 | Obrigatória |
| Design tokens iniciais + paleta primária | Wave 3.1 (Sprint Tarefa 4.A) | Wave 4.0 (paleta OKLCH dark estende) | Obrigatória |
| API pública REST, arquitetura distribuída (Go/NATS), TSE completo, Wave 3.3/3.4 pausadas | Wave 3 anterior | Wave 5+ | Migrados — fora das Waves 3 e 4 atuais |
