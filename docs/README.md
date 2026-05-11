# Brasil a Vera — Documentação

> Transparência Legislativa para o Cidadão Brasileiro
> "Você escolheu quem te representa. Agora veja o que ele faz."

---

## Sumário

Este repositório contém a documentação completa do Brasil a Vera, uma plataforma open-source de transparência legislativa que unifica dados públicos de múltiplas fontes oficiais (Câmara dos Deputados, Senado Federal, TSE, Portal da Transparência) para dar visibilidade ao que parlamentares brasileiros votam, propõem e gastam.

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
| [ADR-002 — Backend (TS → Go)](architecture/ADR/002-backend-language-and-framework.md) | TypeScript na Wave 0–2; Go na Wave 3 — `proposed` |
| [ADR-003 — Banco no Neon](architecture/ADR/003-database-neon.md) | PostgreSQL no Neon (substitui Supabase) |
| [ADR-006 — Stack Frontend](architecture/ADR/006-frontend-stack.md) | Next.js + TypeScript + Drizzle + Biome |
| [ADR-007 — Monolith First](architecture/ADR/007-monolith-first-strategy.md) | Monolito Next.js nas Waves 0–2; Strangler Fig na Wave 3 |
| [ADR-008 — Tooling Frontend](architecture/ADR/008-frontend-tooling.md) | Biome, Husky e React Flow |
| [ADR-009 — Cloudflare Workers](architecture/ADR/009-cloudflare-pages.md) | Deploy em Cloudflare Workers (substitui Vercel) |
| [ADR-011 — Driver de Banco](architecture/ADR/011-database-driver.md) | `drizzle-orm/neon-serverless` + `@neondatabase/serverless` |
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

---

## Arquitetura: Monolith First

Nas Waves 0–2, o Brasil a Vera é um **monolito Next.js modular** (TypeScript) deployado no Cloudflare Workers, com PostgreSQL no Neon e ingestão via GitHub Actions. Custo total: ~R$3,30/mês (só o domínio).

Na Wave 3+, módulos são extraídos para **microserviços Go** via Strangler Fig, com NATS JetStream para eventos e Caddy como API Gateway. Detalhes no [ADR-007](architecture/ADR/007-monolith-first-strategy.md).

## Como Navegar

- **Novo no projeto?** Comece pelo [Product Vision](product/PRODUCT-VISION.md) e depois [Bounded Contexts](architecture/BOUNDED-CONTEXTS.md)
- **Quer entender a arquitetura?** Leia os [ADRs](architecture/ADR/) em ordem numérica — especialmente o [ADR-007 (Monolith First)](architecture/ADR/007-monolith-first-strategy.md)
- **Quer contribuir?** Vá direto para [Guia de Contribuição](contributing/CONTRIBUTING.md)
- **Quer entender o domínio?** Comece pelo [Processo Legislativo](domain/LEGISLATIVE-PROCESS.md)
