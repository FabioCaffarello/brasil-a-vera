# Brasil a Vera — Documentação

> Transparência Legislativa para o Cidadão Brasileiro
> "Você escolheu quem te representa. Agora veja o que ele faz."

---

## Sumário

Este repositório contém a documentação completa do Brasil a Vera, uma plataforma de transparência legislativa com código publicamente auditável (PolyForm Noncommercial 1.0.0) que unifica dados públicos de múltiplas fontes oficiais (Câmara dos Deputados, Senado Federal, TSE, Portal da Transparência) para dar visibilidade ao que parlamentares brasileiros votam, propõem e gastam.

Três capacidades diferenciadoras:

- **Motor de Coerência** — detecta pares de votos contraditórios do mesmo parlamentar de forma factual, sem juízo de valor
- **Grafo Legislativo** — modela vínculos reais entre parlamentares por co-votação, co-autoria, comissões e partido
- **Pirâmide de Confiança** — separa rigorosamente dados brutos (L1) de agregações (L2), correlações (L3) e impacto (L4)

---

## Estrutura da Documentação

### Produto

| Documento | Descrição |
|-----------|-----------|
| [Product Vision](product/PRODUCT-VISION.md) | Visão do produto — fonte de verdade viva |
| [Personas](product/PERSONAS.md) | Personas detalhadas com jornadas e métricas |
| [Roadmap](product/ROADMAP.md) | Waves, critérios de done e dependências |
| [Métricas](product/METRICS.md) | Framework de medição e metas por wave |

### Arquitetura

| Documento | Descrição |
|-----------|-----------|
| [ADRs](architecture/ADR/) | Architecture Decision Records ativos |
| [ADR-001 — Monorepo](architecture/ADR/001-monorepo-strategy.md) | Estratégia de monorepo com módulos por bounded context |
| [ADR-002 — Backend](architecture/ADR/002-backend-language-and-framework.md) | TypeScript; o plano "Go na Wave 3" foi descartado pelo ADR-020 |
| [ADR-003 — Banco no Neon](architecture/ADR/003-database-neon.md) | PostgreSQL no Neon (substitui Supabase) |
| [ADR-006 — Stack Frontend](architecture/ADR/006-frontend-stack.md) | Next.js + TypeScript + Drizzle + Biome |
| [ADR-007 — Monolith First](architecture/ADR/007-monolith-first-strategy.md) | Monolito Next.js modular; a extração Strangler Fig foi descartada pelo ADR-020 |
| [ADR-008 — Tooling Frontend](architecture/ADR/008-frontend-tooling.md) | Biome, Husky e React Flow |
| [ADR-009 — Cloudflare Workers](architecture/ADR/009-cloudflare-pages.md) | Deploy em Cloudflare Workers (substitui Vercel) |
| [ADR-011 — Driver de Banco](architecture/ADR/011-database-driver.md) | `drizzle-orm/neon-serverless` + `@neondatabase/serverless` |
| [ADR-020 — Permanência do Monolito TypeScript](architecture/ADR/020-permanencia-monolito-typescript.md) | Monolito Next.js é a arquitetura-alvo; Go/microserviços descartados (supersede parte dos ADR-002 e ADR-007) |
| [ADR-021 — Design System shadcn curado](architecture/ADR/021-design-system-shadcn-curado.md) | DS próprio in-repo; parcialmente superseded pelo ADR-033 (curadoria, tokens e boundary permanecem) |
| [ADR-033 — Adoção do RDS como pacote externo](architecture/ADR/033-adocao-react-design-system-externo.md) | Migração para `@fabio.caffarello/react-design-system` via strangler fig por rota (processo em `migration/`) |
| [Bounded Contexts](architecture/BOUNDED-CONTEXTS.md) | Mapa de contextos DDD com responsabilidades e relações |
| [Modelo de Domínio](architecture/DOMAIN-MODEL.md) | Aggregates, entities, value objects e domain events |
| [Pirâmide de Confiança](architecture/TRUST-PYRAMID.md) | Arquitetura de credibilidade L1–L4 |
| [Fontes de Dados](architecture/DATA-SOURCES.md) | Fontes oficiais, contratos e estratégia de ingestão |
| [Diagramas C4](architecture/C4-DIAGRAMS.md) | Diagramas de contexto, containers e componentes |

### Features

| Documento | Descrição |
|-----------|-----------|
| [Motor de Coerência](future/COHERENCE-ENGINE.md) | Pipeline de detecção de pares contraditórios (Wave 3+ — deferred) |
| [Grafo Legislativo](future/LEGISLATIVE-GRAPH.md) | Rede de vínculos, métricas e algoritmos (Wave 3+ — deferred) |
| [Parlamentar 360°](features/PARLAMENTAR-360.md) | Página unificada do parlamentar (MVP) |
| [Busca Unificada](features/SEARCH.md) | Busca por parlamentar, proposição e tema |

### Domínio

| Documento | Descrição |
|-----------|-----------|
| [Processo Legislativo](domain/LEGISLATIVE-PROCESS.md) | Glossário do processo legislativo brasileiro |
| [Dicionário de Dados](domain/DATA-DICTIONARY.md) | Campos, tipos, fontes e trust_level |

### Contribuição

| Documento | Descrição |
|-----------|-----------|
| [Guia de Contribuição](contributing/CONTRIBUTING.md) | Como contribuir para o projeto |
| [Estilo de Código](contributing/CODE-STYLE.md) | Padrões de código e linting |
| [Convenção de Commits](contributing/COMMIT-CONVENTION.md) | Padrão de mensagens de commit |
| [Workflows do GitHub Actions](contributing/WORKFLOWS.md) | Mapa dos workflows ativos (tabela mantida por convenção) |
| [Branch Protection](contributing/BRANCH-PROTECTION.md) | Proteção da main vigente |

### Design

| Documento | Descrição |
|-----------|-----------|
| [Design Tokens](design/DESIGN-TOKENS.md) | Paleta, contraste WCAG e padrões de uso (inclui §charts) |
| [Planos de wave (7–9)](design/) | `WAVE-N-*-PLAN*.md` — planos e handoffs de design por wave (registro histórico; wave é metadata, não diretório) |

### Migração RDS (temporário — em curso)

| Documento | Descrição |
|-----------|-----------|
| [Matriz de migração](migration/migration-matrix.md) | 133 componentes em 4 categorias × RDS |
| [Prontidão por rota](migration/route-readiness.md) | 21 rotas classificadas (alta/média/baixa) |
| [Playbook rota-a-rota](migration/route-migration-playbook.md) | Processo destilado da rota piloto |
| [Token map](migration/token-map.md) | Tabela canônica de tradução BaV × RDS — fonte única |
| [Dívida de consolidação](migration/consolidation-debt.md) | Pares cópia-rds × original (vigiada pelo `consolidation-guard` no CI) |
| [Inventário de componentes](migration/component-inventory.md) | Inventário-base da matriz |

Regra de extinção ([ADR-033 §4](architecture/ADR/033-adocao-react-design-system-externo.md)): quando a migração consolidar, este diretório é **congelado como registro histórico** (banner no topo, sem mudanças posteriores) e o `consolidation-guard.yml` é removido junto.

### Operações

| Documento | Descrição |
|-----------|-----------|
| [Higiene do Neon](ops/NEON-HYGIENE.md) | Checklist para o banco continuar scale-to-zero |
| [Investigação Neon-acordado](ops/INVESTIGATE-NEON-WAKE.md) | Runbook para identificar o que impede o banco de dormir |

### Releases

| Documento | Descrição |
|-----------|-----------|
| [Release notes por versão](releases/) | Registro primário por tag (`v0.X.Y-*`) — único eixo temporal de `docs/`; cronologia transversal em [HISTORY.md](HISTORY.md) |

### Sementes

| Documento | Descrição |
|-----------|-----------|
| [Product Vision v1.0 (docx)](seeds/Brasil-a-Vera-Product-Vision-v1.0.docx) | Documento fundacional original — não alterar |

---

## Princípios da Documentação

1. **Autossuficiência** — cada documento é compreensível por si só, com links para aprofundamentos
2. **Fonte única de verdade** — informação vive num único doc; outros linkam em vez de duplicar
3. **Linguagem precisa** — termos legislativos usados corretamente (PEC ≠ PL, votação nominal ≠ simbólica)
4. **Trust level em tudo** — cada dado ou métrica indica seu trust_level (L1, L2, L3, L4)
5. **Diagramas em Mermaid** — todos os diagramas inline nos markdowns
6. **Português do Brasil** — exceto termos técnicos consagrados em inglês
7. **Tipo, não tempo** — `docs/` é organizado por tipo atemporal; wave é metadata
   no nome/header do arquivo, nunca diretório (`docs/wave-N/` é proibido). O único
   eixo temporal é `releases/`, uma nota por tag. Planos de wave vivem em
   `design/` (handoffs) e `product/` (prompts mestres); a cronologia transversal
   vive em [HISTORY.md](HISTORY.md), alimentado pelo ritual `/release-notes`.
   Diretórios de esforço temporário (ex.: `migration/`) nascem com regra de
   extinção registrada em ADR e são congelados como histórico ao concluir.
8. **Doc vivo exige ritual** — toda tabela/índice que se declara "mantido"
   precisa de um gatilho que o alimente (skill, convenção de PR ou check no CI);
   doc sem ritual apodrece (lição WORKFLOWS.md/HISTORY, auditoria 2026-06).

---

## Arquitetura: Monolito Permanente

O Brasil a Vera é um **monolito Next.js modular** (TypeScript) deployado no Cloudflare Workers, com PostgreSQL no Neon e ingestão via GitHub Actions. Custo total: ~R$3,30/mês (só o domínio).

A extração para microserviços Go via Strangler Fig, prevista no plano original do [ADR-007](architecture/ADR/007-monolith-first-strategy.md), foi **descartada** pelo [ADR-020](architecture/ADR/020-permanencia-monolito-typescript.md): o monolito é a arquitetura-alvo permanente enquanto o projeto for solo e otimizado por custo operacional próximo de zero.

## Como Navegar

- **Novo no projeto?** Comece pelo [Product Vision](product/PRODUCT-VISION.md) e depois [Bounded Contexts](architecture/BOUNDED-CONTEXTS.md)
- **Quer entender a arquitetura?** Leia os [ADRs](architecture/ADR/) em ordem numérica — especialmente o [ADR-007 (Monolith First)](architecture/ADR/007-monolith-first-strategy.md) junto do [ADR-020 (permanência do monolito)](architecture/ADR/020-permanencia-monolito-typescript.md), que o revisa
- **Quer contribuir?** Vá direto para [Guia de Contribuição](contributing/CONTRIBUTING.md)
- **Quer entender o domínio?** Comece pelo [Processo Legislativo](domain/LEGISLATIVE-PROCESS.md)
- **Quer o histórico?** [HISTORY.md](HISTORY.md) — cronologia de waves, incidentes nomeados e a origem dos princípios do CLAUDE.md
