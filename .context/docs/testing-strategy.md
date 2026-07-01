---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Testing Strategy

Quality is maintained through a combination of Vitest unit tests (pure domain functions), integration tests with real Postgres via testcontainers (query layer), and guard scripts (RDS consolidation invariants, WCAG contrast, CSS layer correctness). **No DB mocking** — mocking `db`/`Pool` is explicitly forbidden (burned by mock/prod divergence in past migration).

## Test Types

- **Unit** (`*.test.ts` co-located or in `__tests__/`): Pure domain logic in `src/modules/*/domain/`, CSV parsers, cache helpers, ingestion mappers. Framework: Vitest. Fast, no external deps.
- **Integration** (`*.integration.test.ts` in `tests/integration/`): Query functions against a real Postgres 17 container (testcontainers). Covers `src/lib/queries/`, export endpoints, stats auth. Require Docker.
- **Guard scripts** (`scripts/`): Not Vitest — standalone TypeScript scripts run via `npx tsx`. Three guards:
  - `scripts/rds-noop-guard.ts` — checks RDS semantic tokens resolve to non-empty CSS values
  - `scripts/rds-primitive-guard.ts` — ensures no forbidden local primitives are imported
  - `scripts/wcag-check.ts` — WCAG AA contrast ratio verification for light/dark tokens
- **Hook tests** (`.claude/hooks/__tests__/test-hooks.sh`): Shell test matrix for Claude Code hooks (role enforcement, deny list).

## Running Tests

- All unit tests (watch): `npm run test`
- Coverage report: `npm run test:coverage`
- Single file: `npx vitest run src/path/to/file.test.ts`
- Integration tests: `npm run test:integration` (requires Docker)
- RDS noop guard: `npm run guard:rds-noop`
- RDS primitive guard: `npm run guard:rds-primitive`
- WCAG check: `npm run wcag:check`

## Quality Gates

Before any PR merge:

- `npm run ci` — Biome strict lint + format (same as CI)
- `npm run test:coverage` — unit + coverage thresholds must pass
- `npm run build` — build time is a canary (baseline ~975ms; spikes = bundle leak)
- `npm run guard:rds-noop` + `npm run guard:rds-primitive` — required for any component/design system changes
- Integration tests required for changes touching `src/lib/queries/` or DB schema
- **No `any`** in TypeScript — Biome catches this
- **No mocking DB** — testcontainers only for DB integration tests

## Troubleshooting

- **Integration tests fail locally**: Ensure Docker is running (`docker info`). Testcontainers pulls `postgres:17` on first run.
- **Guard scripts fail with CSS parse errors**: RDS CSS must be built first — the guard reads `node_modules/@fabio.caffarello/react-design-system/dist/index.css`.
- **`npm run lint` not found**: Project uses `npm run check` (Biome), not `npm run lint` (no ESLint).
- **Build time spike (5s+)**: Something in `ingestion/` leaked into the app bundle. Check `next.config.ts` `serverExternalPackages` and trace the import chain.
- **Testcontainers slow on first run**: Postgres image pull takes ~30s. Subsequent runs use cached image.

## Related Resources

- [Development Workflow](development-workflow.md)
- [CLAUDE.md §13 — Empirical validation](../../CLAUDE.md)
