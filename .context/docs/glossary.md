---
type: doc
name: glossary
description: Project terminology, type definitions, domain entities, and business rules
category: glossary
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Glossary & Domain Concepts

Brasil a Vera deals with Brazilian legislative domain terms. Understanding these is essential before modifying ingestion or domain logic.

## Core Terms

- **Parlamentar** — A member of the Brazilian legislature (deputado federal in Câmara, senador in Senado). Primary aggregate root. `src/modules/parlamentares/`
- **Proposição** — A legislative bill, amendment, or resolution. Identified by `tipo/numero/ano` (e.g. PL/1234/2023). `src/modules/proposicoes/`
- **Votação** — A recorded vote session in either house. Contains individual votos nominais. `src/modules/votacoes/`
- **Voto nominal** — An individual parlamentar's recorded vote (Sim, Não, Abstenção, Ausente, Obstrução) on a votação.
- **Orientação de bancada** — Party caucus voting directive before a session. Stored per-votação per-partido.
- **Alinhamento** — Agreement score (%) between a parlamentar's votes and their party's orientações. `src/modules/parlamentares/domain/alinhamento.ts`
- **Coerência** — Cross-session voting consistency metric. `src/lib/coerencia/`
- **CEAP** (Cota para o Exercício da Atividade Parlamentar) — Monthly reimbursement allowance. Expenses tracked in `gastos` table with CNPJ of supplier.
- **TSE** — Tribunal Superior Eleitoral. Source for candidacy data, patrimônio declarations (bens), and electoral results.
- **Bem/Patrimônio** — Asset declared to TSE. Tracked across election cycles (2014, 2018, 2022). `src/modules/eleitoral/`
- **Veto** — Executive veto of legislation. Tracked in `src/modules/vetos/`.
- **Frente parlamentar** — A cross-party caucus. `src/app/frentes/`
- **Comissão** — A standing committee in either house. Members tracked in `membro_comissao`.
- **Discurso** — A floor speech, tracked in `src/modules/discursos/`.
- **Tramitação** — The lifecycle/progression of a proposição through committees and plenary.
- **Casa** — Which house: `camara` or `senado`.
- **UF** — Brazilian state abbreviation (27 states + DF). `src/lib/ufs.ts`
- **Painel** — The authenticated personal dashboard at `/painel/*`. Tabs: Resumo, Parlamentares seguidos, Alertas, Configurações, Meus Dados.
- **Follow** — A user following a parlamentar to receive weekly digest alerts. `src/lib/queries/follows.ts`

## Type Definitions

- [`TrustLevel`](../../src/shared/trust/types.ts) — `"L1" | "L2" | "L3" | "L4"` — data confidence level (L1=highest, L4=lowest/estimated)
- [`Uf`](../../src/lib/ufs.ts) — 27 Brazilian state abbreviations
- [`Cadence`](../../ingestion/registry.ts) — Ingestion frequency: `"daily" | "weekly" | "monthly" | "quarterly" | "manual"`
- [`IngestionSource`](../../ingestion/registry.ts) — Registry entry with name, cadence, script, and tiers
- [`TabKey`](../../src/lib/painel-tabs.ts) — Dashboard tab identifiers
- [`TtlKey`](../../src/lib/cache.ts) — Cache TTL constants (votacaoHistorica=7d, listagemFiltrada=5min, etc.)
- [`AlinhamentoStats`](../../src/modules/parlamentares/domain/alinhamento.ts) — Alignment score aggregate
- [`PrivacyConsentState`](../../src/lib/privacy.ts) — LGPD consent tracking

## Enumerations

- `trust_level` column: `L1` (API oficial confirmada), `L2` (API cross-validada), `L3` (inferida), `L4` (estimada)
- `casa`: `"camara"` | `"senado"` — throughout DB and app
- `tipo_voto`: `"Sim" | "Não" | "Abstenção" | "Ausente" | "Obstrução"` — `ingestion/senado/votos-mapper.ts`

## Acronyms & Abbreviations

- **BaV** — Brasil a Vera (project codename)
- **RDS** — `@fabio.caffarello/react-design-system` (external design system, ADR-033)
- **CEAP** — Cota para o Exercício da Atividade Parlamentar (expense allowance)
- **TSE** — Tribunal Superior Eleitoral
- **ADR** — Architectural Decision Record (`docs/architecture/ADR/`)
- **LGPD** — Lei Geral de Proteção de Dados (Brazil's GDPR equivalent)
- **SSG** — Static Site Generation (Next.js, used for profiles per CLAUDE.md §9)
- **RSC** — React Server Component
- **ORM** — Drizzle (object-relational mapper used for queries)
- **PREVC** — Planning→Review→Execution→Validation→Confirmation (dotcontext workflow phases)

## Personas / Actors

- **Cidadão Consciente** (P1) — Shares voting records on WhatsApp/X. Arrives via deep link. Needs fast profile page (SSG) and share metadata (OG images).
- **Jornalista / Pesquisador** (P2) — Uses export CSVs, filters, and rankings. Authenticated for bulk export. Uses `/comparar` to cross-reference parlamentares.
- **Militante** (P3) — Follows specific parlamentares, configures alerts for themes and parties. Uses `/painel/*` for persistent preferences.

## Domain Rules & Invariants

1. **Trust level is set at ingest, never changed by app code.** Only ingestion scripts assign `trust_level`.
2. **Votações are immutable after ingestion.** Once a session closes, votos nominais are final. Cache TTL=7d reflects this (ADR-028).
3. **Idempotent ingestion.** All ETL uses `INSERT ... ON CONFLICT DO UPDATE` or `DELETE-by-key + INSERT` in a transaction. Running twice produces the same result.
4. **Alinhamento is calculated from orientações, not hardcoded.** Missing orientação = no alinhamento for that votação (fail-closed, ADR-042).
5. **CPF is Câmara-only.** Senado parlamentares may have null CPF (backfill in progress via `backfill-cpf-senado.ts`).
6. **Export requires authentication.** `canExport()` in `src/lib/auth-guards.ts` gates all mass export server-side. Anônimo never sees export button.

## Related Resources

- [Project Overview](project-overview.md)
- [Domain docs](../../docs/domain/)
