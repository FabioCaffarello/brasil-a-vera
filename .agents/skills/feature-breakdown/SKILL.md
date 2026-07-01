---
name: feature-breakdown
description: Break down features into implementable tasks. Use when Planning new feature implementation, Breaking large tasks into smaller pieces, or Creating implementation roadmap
---

## Workflow

1. Read the feature spec in `docs/features/` or the GitHub issue — do not start without a written scope
2. Check relevant ADRs in `docs/architecture/ADR/` — the decision may already constrain the approach
3. Identify which bounded contexts are involved (`src/modules/`, `ingestion/`, `src/app/`)
4. Determine if >3 files will be touched — if yes, plan must be proposed and approved before execution
5. Break into independent, testable tasks ordered by dependency
6. For each task: name the target file(s), the acceptance criterion, and whether tests are needed
7. Flag any external API unknowns (Senado/Câmara/TSE APIs are unstable — budget retry logic)

## Examples

**Feature breakdown: Eixo 3 — Campaign financing tab on parlamentar profile**

```
## Feature: Financiamento Eleitoral (Eixo 3) — issue #512

### Prerequisites check:
- [X] TSE candidatura data exists in tse_candidatura (L2 trust)
- [X] extrairCnpj utility reusable from ingestion/tse/bens.ts
- [ ] tse_doacao table does NOT exist — new ingestão required (gargalo confirmed)

### Task 1: SQL migration — create tse_doacao table
- File: src/shared/db/migrations/NNNN_tse_doacao.sql
- Columns: id, cpf, nome_doador, cnpj_doador, valor, ano, trust_level, source_url, ingested_at
- Acceptance: migration idempotent; Drizzle schema updated

### Task 2: TSE ingestion script
- Files: ingestion/tse/doacoes.ts, ingestion/tse/doacoes-schema.ts, ingestion/tse/doacoes-mapper.ts
- Register in ingestion/registry.ts with cadence: yearly
- Use INSERT ... ON CONFLICT (cpf, ano, cnpj_doador) DO UPDATE
- Acceptance: npm run ingest:tse:doacoes ANO=2022 populates table

### Task 3: Query + cached()
- File: src/lib/queries/doacoes.ts
- Export: getDoacoesByCpf = cached(async (cpf) => ..., { ttl: TtlKey.ELEITORAL })
- Acceptance: typed return, cached() wrapper present

### Task 4: UI component — FinanciamentoSection
- File: src/components/parlamentar/financiamento.tsx
- Uses RDS Card compound — no custom layout (ADR-053)
- Run npm run guard:rds-noop after
- Acceptance: renders donation list; guard passes

### Dependencies: Task 2 requires Task 1; Task 3 requires Task 1; Task 4 requires Task 3
### Risk: TSE historical donation API may not exist — validate endpoint before Task 2
```

## Quality Bar

- No task starts without a written spec or issue — never speculative breakdown
- ADR gate first: if the feature conflicts with an accepted ADR, flag it before breaking down tasks
- Each task names specific files — not "create the module" but `src/lib/queries/doacoes.ts`
- Tasks touching >3 files collectively require plan approval before any execution
- All DB changes: migration task is always Task 1, all other tasks depend on it explicitly
- All new query functions: `cached()` is acceptance criterion, not afterthought
- External API unknowns are flagged explicitly — Brazilian public APIs are unstable; plan retry logic
- Trust level (`trust_level`, `source_url`, `ingested_at`) is acceptance criterion for any new aggregate root table

## Resource Strategy

- No extra files needed — output is a task list in the conversation or a spec in `docs/features/`.
- Add a references file only if a specific external API shape or CSV format needs to be documented for the feature.
