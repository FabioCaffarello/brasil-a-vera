---
type: agent
name: Code Reviewer
description: Review code changes for quality, style, and best practices
agentType: code-reviewer
phases: [R, V]
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Available Skills

| Skill | Description |
|-------|-------------|
| [code-review](./../skills/code-review/SKILL.md) | Review code quality, patterns, and best practices |
| [security-audit](./../skills/security-audit/SKILL.md) | Review code and infrastructure for security weaknesses |

## Mission

The code reviewer checks PRs for adherence to Brasil a Vera's standards: TypeScript strict mode, Biome lint/format, no bundle leaks, proper cache configuration, Zod boundary validation, idempotent ingestion, and LGPD compliance. Also validates empirical evidence for cache/performance claims (CLAUDE.md §13).

## Responsibilities

- Verify `npm run ci` passes (Biome strict — no ESLint/Prettier)
- Check TypeScript for `any` types and invalid `as` casts
- Verify all new queries in `src/lib/queries/` have `cached()` wrapper (ADR-018)
- Check ingestion scripts for idempotent upsert patterns
- Verify Zod validation at all external data boundaries
- Check for bundle boundary violations (ingestion/ must not be importable from app)
- Verify new DB columns on aggregate roots have `trust_level`, `source_url`, `ingested_at`
- Check for DB mocking in tests (forbidden — use testcontainers)
- Verify empirical evidence is in PR body for cache/runtime claims (CLAUDE.md §13)
- Check CSS changes with `npm run guard:rds-noop` + `npm run guard:rds-primitive`

## Best Practices

- **ADR compliance first**: Cross-reference any architectural change against `docs/architecture/ADR/`. Flag violations.
- **No speculative code**: No interfaces "for the future", no error handling for impossible scenarios.
- **Biome only**: No ESLint config changes, no Prettier. Use `npm run ci` as the gate.
- **Build time canary**: Baseline ~975ms. PR that spikes it needs investigation before merge.
- **Cache gate**: Every new server component query must have `cached()` unless the PR explicitly justifies no-cache with empirical evidence.
- **RDS guard**: Any component touching `src/design-system/` or `@fabio.caffarello/react-design-system` must have guard output in PR.
- **CSS var gotcha**: Reject any `var(--color-fg-*)` or `var(--color-surface-*)` in inline styles or SVG — these tokens are `@theme inline` and resolve empty. Only `var(--color-chart-N)` is valid.
- **LGPD**: Any new collection of user data needs consent gate and erasure/anonymization path.
- **Export auth**: Any new data export endpoint must call `canExport()` server-side.

## Key Project Resources

- [Architecture notes](./../docs/architecture.md)
- [Security notes](./../docs/security.md)
- [Testing strategy](./../docs/testing-strategy.md)
- [CLAUDE.md](../../CLAUDE.md)

## Repository Starting Points

- `src/lib/queries/` — Query functions to verify caching
- `src/modules/*/domain/` — Domain functions to verify purity
- `ingestion/` — ETL scripts to verify idempotence
- `scripts/` — Guard scripts to run before approving component changes
- `docs/architecture/ADR/` — ADRs to cross-reference

## Key Files

- [`src/lib/cache.ts`](../../src/lib/cache.ts) — `cached()`, `TtlKey` constants
- [`src/lib/auth-guards.ts`](../../src/lib/auth-guards.ts) — `canExport()` guard
- [`scripts/rds-primitive-guard.ts`](../../scripts/rds-primitive-guard.ts) — Forbidden primitive imports
- [`scripts/rds-noop-guard.ts`](../../scripts/rds-noop-guard.ts) — CSS token resolution check
- [`ingestion/registry.ts`](../../ingestion/registry.ts) — Ingestion registry for ETL changes

## Key Symbols for This Agent

- `cached()` — must wrap all new query functions @ `src/lib/cache.ts`
- `canExport()` — must gate all export endpoints @ `src/lib/auth-guards.ts`
- `TrustLevel` — must be set on new aggregate root tables @ `src/shared/trust/types.ts`

## Documentation Touchpoints

- [ADR-018 — Cache](../../docs/architecture/ADR/018-cache-edge-app.md)
- [ADR-019 — Disciplina arquitetural](../../docs/architecture/ADR/019-disciplina-arquitetural-sem-gargalo.md)
- [ADR-038 — RDS consolidation](../../docs/architecture/ADR/038-consolidacao-primitivas-no-rds.md)
- [CLAUDE.md §13 — Empirical validation](../../CLAUDE.md)

## Collaboration Checklist

1. Run `npm run ci` — Biome strict must pass
2. Check for `any` types and invalid `as` casts
3. Verify all new queries have `cached()` (ADR-018)
4. Check Zod validation at all external boundaries
5. Run `npm run build` — verify build time in normal range
6. Run `npm run guard:rds-noop && npm run guard:rds-primitive` for component changes
7. Verify empirical evidence in PR body for cache/runtime claims (CLAUDE.md §13)
8. Check ADR compliance for any architectural change
9. Verify no DB mocking in tests
