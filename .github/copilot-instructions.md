# Project Rules and Guidelines

> Auto-generated from .context/docs on 2026-07-01T06:06:23.750Z

## rules-CLAUDE

---
source: CLAUDE.md
type: generic
---

# Brasil a Vera

Plataforma de transparência política brasileira. Código publicamente auditável
(PolyForm Noncommercial 1.0.0), mantida por doação, projetada para ter custo
operacional próximo de zero.

## Propósito

Consolidar dados públicos do Legislativo brasileiro (Câmara, Senado, TSE, Portal
da Transparência) em interface acessível para qualquer cidadão. Slogan:
"Você escolheu quem te representa. Agora veja o que ele faz."

Visão completa: [docs/product/PRODUCT-VISION.md](docs/product/PRODUCT-VISION.md)

## Stack

- Runtime: Node.js 22, TypeScript strict mode
- Framework: Next.js 16 (App Router)
- Banco: PostgreSQL no Neon (não Supabase — ver ADR-003)
- ORM: Drizzle (queries); SQL puro (migrations)
- Validação: Zod em todo boundary externo
- Lint/format: Biome (não ESLint+Prettier)
- Testes: Vitest
- Deploy: Cloudflare Workers via `@opennextjs/cloudflare` (não Vercel — ver ADR-009)
- Ingestão: tsx scripts em GitHub Actions cron

## Princípios de código

1. Funções puras na lógica de domínio. IO isolado.
2. Zod no boundary. Todo dado externo (API pública, env vars) passa por schema
   validation antes de tocar lógica de negócio.
3. Trust level em aggregate roots. Coluna `trust_level` (L1/L2/L3/L4) +
   `source_url` + `ingested_at` nas tabelas raiz (parlamentar, proposicao,
   votacao, gasto). Tabelas filhas (tema, autor, tramitação, voto_nominal,
   orientação) herdam a confiança da raiz — não duplicam.
4. Migrations em SQL puro versionadas em `src/shared/db/migrations/`.
5. Idempotência na ingestão. Use `INSERT ... ON CONFLICT DO UPDATE` quando há
   chave natural única, ou `DELETE-by-key + INSERT` dentro de uma transação
   quando a substituição é em massa (ex.: gastos do ano, votos de uma sessão).
6. Sem `any`. Sem `as` cast exceto pra `unknown -> tipo validado por Zod`.
7. Erros são valores quando possível. Funções que podem falhar retornam tipo
   explícito.

## Disciplina de custo (Neon serverless)

8. Toda nova query em `src/lib/queries/**` consumida por server component
   tem cache de edge configurado (ver [ADR-018](docs/architecture/ADR/018-cache-edge-app.md)).
   Sem cache = decisão intencional no PR, com justificativa.
9. Páginas de detalhe (perfil de parlamentar, proposição específica,
   votação histórica) usam SSG com `revalidate` periódico — não dynamic
   rendering. Dynamic rendering somente em buscas e filtros customizados.
10. Antes de criar índice novo em alguma tabela, anexar output de
    `EXPLAIN ANALYZE` no PR provando que a query atual precisa dele. Índice
    sem evidência empírica é overhead permanente de escrita sem benefício
    proporcional de leitura. Ver [ADR-017](docs/architecture/ADR/017-budget-mensal-observabilidade.md).
11. Antes de adicionar campo `text` com média estimada > 500 bytes, considerar
    armazenar URL + fetch on-demand em vez do conteúdo inline. Texto longo
    inflaciona linearmente o banco e o R2 é destino mais barato para conteúdo
    estático. Ver [ADR-016](docs/architecture/ADR/016-cobertura-temporal-arquivamento.md).
12. Crons de ingestão concentram trabalho em batches curtos. Não disparar
    queries fora dos windows de ingestão planejados — banco scale-to-zero do
    Neon é regra, não exceção. Probes de monitoramento devem hit o `/api/health`
    (que não toca DB), não rotas que fazem SELECT.

## Disciplina operacional

13. Decisões de cache, performance ou runtime behavior exigem
    validação empírica antes de implementação. Hipótese teórica
    sobre comportamento de cache (cf-cache-status, x-nextjs-cache,
    s-maxage consumption), latência ou semântica de runtime não
    basta — confirmar com curl/script em ambiente real, registrar
    output literal no plan/PR, e só então mergear. Lição registrada
    após PR #57 (revert): hipótese sobre edge CDN nativo em URLs
    *.workers.dev foi falsificada empiricamente após merge.

## Comandos

```bash
# Desenvolvimento
npm run dev              # Next dev server
npm run build            # Build produção
npm run check            # Biome lint + format check (use antes do PR)
npm run ci               # Biome ci (estrito, mesmo do CI)
npm run test             # Vitest watch
npm run test:coverage    # Vitest com coverage + thresholds

# Database (Drizzle Kit)
npm run db:generate      # Gera migration do schema Drizzle
npm run db:migrate       # Aplica migrations no banco
npm run db:studio        # UI do Drizzle pra inspecionar dados

# Cloudflare Workers
npm run cf:build         # Build pro Cloudflare Workers via OpenNext
npm run cf:preview       # Preview local com Wrangler
npm run cf:deploy        # Deploy no Cloudflare Workers

# Ingestão (rodados em GitHub Actions cron; também úteis localmente)
npm run ingest:camara:deputados      # Sync deputados da Câmara
npm run ingest:senado:senadores      # Sync senadores
npm run ingest:camara:proposicoes    # Sync proposições da Câmara (janela default 30d)
npm run ingest:senado:proposicoes    # Sync proposições do Senado
npm run ingest:camara:votacoes       # Sync votações da Câmara
npm run ingest:senado:votacoes       # Sync votações do Senado
npm run ingest:camara:gastos         # Sync gastos CEAP (ano corrente)
npm run backfill:camara:votacao-proposicao  # Vincula votação→proposição em rows com FK NULL

# Envs aceitos pelos scripts de ingestão (validados por Zod):
#   DATA_INICIO=YYYY-MM-DD  DATA_FIM=YYYY-MM-DD  ANO=YYYY
```

## Estrutura
src/
├── app/                  # Next App Router (pages + API routes)
├── modules/              # Bounded contexts (criados conforme necessidade)
├── shared/               # Código transversal (db, trust, http)
├── components/           # React components
└── lib/                  # Utilitários gerais
ingestion/                # Scripts ETL standalone (não Next.js)
docs/
├── architecture/         # Modelos, diagramas, princípios; ADRs ativos em ADR/
├── product/              # PRODUCT-VISION, ROADMAP, PERSONAS, METRICS
├── domain/               # Glossário e processo legislativo
├── contributing/         # Guias para contribuidores (inclui WORKFLOWS.md)
├── features/             # Specs de features em escopo
├── design/               # Tokens, planos de design e handoffs
├── migration/            # Migração RDS em curso (matriz, playbook, débitos)
├── ops/                  # Runbooks operacionais
├── releases/             # Release notes por versão
├── seeds/                # Documentos fundacionais (não alterar)
└── future/               # Visão futura, não compromisso de implementação

## Convenções

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Branches: `feat/<descricao>`, `fix/<descricao>`. Nunca direto na `main`.
- PRs: descrição obrigatória. CI passando bloqueia merge.
- Sem secrets no repo. `.env` ignorado, GitHub Secrets em CI.

## Regras para Claude Code trabalhar neste projeto

- Sempre cheque `docs/architecture/ADR/` antes de propor mudanças arquiteturais.
  Se a mudança contraria um ADR aceito, ou você muda o ADR (com justificativa
  explícita) ou rejeita a mudança.
- Antes de criar pasta ou módulo novo, verifique se já existe estrutura similar.
- Antes de instalar dependência nova, justifique no PR. Preferimos código próprio
  a libs com escopo amplo.
- NÃO escreva código especulativo. Não crie interfaces "para o caso de".
  Reaja a necessidade real, não a possibilidade futura.
- NÃO use ESLint nem Prettier. Use Biome (`npm run check`).
- Design system: em migração para o pacote `@fabio.caffarello/react-design-system`
  conforme [ADR-033](docs/architecture/ADR/033-adocao-react-design-system-externo.md)
  (strangler fig por rota sob `/rds/`, processo em `docs/migration/`). Gap de
  componente genérico vira issue no repo do RDS, não primitiva shadcn nova.
  Curadoria, tokens semânticos e import boundary do
  [ADR-021](docs/architecture/ADR/021-design-system-shadcn-curado.md) permanecem;
  bibliotecas de UI seguem critério leve (justificativa no PR), sem ADR por dep.
  Consolidação de primitivas concluída ([ADR-038](docs/architecture/ADR/038-consolidacao-primitivas-no-rds.md));
  a fase ativa é a adoção da **camada compositiva** do RDS
  ([ADR-053](docs/architecture/ADR/053-adocao-camada-compositiva-rds.md)): componente
  de domínio em `src/components/` é construído *sobre* as composições/patterns do RDS
  (Card compound, Timeline, Breadcrumb, Avatar…), não reinventa layout que o RDS já
  oferece.
- Erros da API da Câmara são esperados. APIs públicas brasileiras são instáveis.
  Sempre retry com backoff, sempre log estruturado de falha, nunca crash silencioso.
- Plan mode antes de mudanças amplas. Para qualquer task que toque mais de 3
  arquivos, primeiro proponha o plano, espere aprovação, então execute.
- ADRs em `docs/future/adr/` representam visão de longo prazo, não compromisso.
  Não os trate como aceitos.

## Operação multi-contribuidor (Wave 5+)

Este projeto opera com roles (`engineer`, `designer`) a partir da Wave 5.
A configuração do ecossistema `.claude/` está versionada e é a fonte de
verdade. Quem opera Claude Code aqui:

- Lê primeiro `.claude/README.md` (orientação geral).
- Identifica seu role (default `designer`; engineer declara via
  `export BAV_CLAUDE_ROLE=engineer` no shell rc).
- Lê o onboarding correspondente em `.claude/docs/ONBOARDING-*.md`.

Hooks em `.claude/hooks/` aplicam guard-rails por role automaticamente
(matriz em `.claude/docs/ROLES.md`). CODEOWNERS em
`.github/CODEOWNERS` define revisão obrigatória por área quando branch
protection ligar "Require review from Code Owners" (ver
`docs/contributing/BRANCH-PROTECTION.md`).

Adições ao ecossistema (skill, hook, agent) seguem ADR-019: gargalo
concreto observado antes da peça nova. Teste empírico em sessão real
com output literal copiado para o PR.

## Auto-merge — Wave 6 (encerrado)

A cláusula transitória que autorizava o Claude Code a abrir E mergear
PRs com label `auto-merged-wave-6` valeu apenas durante a Wave 6
(Sprint 6.0–6.6) e está **encerrada** desde 2026-06-10. Regime vigente:
revisão normal via CODEOWNERS; merge executado pelo owner ou por
instrução explícita dele na sessão. Histórico: prompt mestre Wave 6 §6
([`docs/product/PROMPT-MESTRE-WAVE-6.md`](docs/product/PROMPT-MESTRE-WAVE-6.md))
e métrica de PRs auto-merged no release v0.6.0.

## Notas

Este é projeto solo (1 dev) mantido por doação. Otimizamos por baixo custo
operacional e simplicidade de manutenção, não por escala teórica.


## rules-AGENTS

---
source: AGENTS.md
type: generic
---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Brasil a Vera — contrato do projeto

Este repositório tem instruções próprias além das regras Next.js acima.
Agente que lê apenas `AGENTS.md` entra cego num repo com guard-rails por
role; trate `CLAUDE.md` como fonte canônica de instruções:

- [`CLAUDE.md`](CLAUDE.md) — princípios de código, disciplina de custo
  (Neon serverless), comandos e regras de operação. Leia antes de
  qualquer mudança.
- [`.claude/README.md`](.claude/README.md) — ecossistema Claude Code
  (skills, hooks, agents) e modelo de permissões.
- [`.claude/docs/ROLES.md`](.claude/docs/ROLES.md) — matriz role × path
  aplicada automaticamente por hooks (`BAV_CLAUDE_ROLE`).
- [`docs/README.md`](docs/README.md) — índice da documentação completa.


## codex-instructions-AGENTS

---
source: AGENTS.md
type: codex
---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Brasil a Vera — contrato do projeto

Este repositório tem instruções próprias além das regras Next.js acima.
Agente que lê apenas `AGENTS.md` entra cego num repo com guard-rails por
role; trate `CLAUDE.md` como fonte canônica de instruções:

- [`CLAUDE.md`](CLAUDE.md) — princípios de código, disciplina de custo
  (Neon serverless), comandos e regras de operação. Leia antes de
  qualquer mudança.
- [`.claude/README.md`](.claude/README.md) — ecossistema Claude Code
  (skills, hooks, agents) e modelo de permissões.
- [`.claude/docs/ROLES.md`](.claude/docs/ROLES.md) — matriz role × path
  aplicada automaticamente por hooks (`BAV_CLAUDE_ROLE`).
- [`docs/README.md`](docs/README.md) — índice da documentação completa.


## antigravity-rules-GEMINI

---
source: ../../.gemini/GEMINI.md
type: antigravity
---



## README

# Documentation Index

Welcome to the repository knowledge base. Start with the project overview, then dive into specific guides as needed.

## Core Guides
- [Project Overview](./project-overview.md)
- [Architecture Notes](./architecture.md)
- [Development Workflow](./development-workflow.md)
- [Testing Strategy](./testing-strategy.md)
- [Glossary & Domain Concepts](./glossary.md)
- [Security & Compliance Notes](./security.md)
- [Tooling & Productivity Guide](./tooling.md)

## Repository Snapshot
- `AGENTS.md/`
- `biome.json/`
- `CLAUDE.md/`
- `components.json/`
- `coverage/`
- `docker-compose.yml/`
- `docs/` — Living documentation produced by this tool.
- `drizzle.config.ts/`
- `ingestion/`
- `LICENSE/`
- `neon-investigation/`
- `next-env.d.ts/`
- `next.config.ts/`
- `open-next.config.ts/`
- `package-lock.json/`
- `package.json/`
- `postcss.config.mjs/`
- `public/`
- `README.md/`
- `scripts/`
- `SECURITY.md/`
- `src/` — TypeScript source files and CLI entrypoints.
- `tests/` — Automated tests and fixtures.
- `tsconfig.ingestion.json/`
- `tsconfig.json/`
- `vitest.config.ts/`
- `vitest.integration.config.ts/`
- `wrangler.jsonc/`
- `zip/`

## Document Map
| Guide | File | Primary Inputs |
| --- | --- | --- |
| Project Overview | `project-overview.md` | Roadmap, README, stakeholder notes |
| Architecture Notes | `architecture.md` | ADRs, service boundaries, dependency graphs |
| Development Workflow | `development-workflow.md` | Branching rules, CI config, contributing guide |
| Testing Strategy | `testing-strategy.md` | Test configs, CI gates, known flaky suites |
| Glossary & Domain Concepts | `glossary.md` | Business terminology, user personas, domain rules |
| Security & Compliance Notes | `security.md` | Auth model, secrets management, compliance requirements |
| Tooling & Productivity Guide | `tooling.md` | CLI scripts, IDE configs, automation workflows |

