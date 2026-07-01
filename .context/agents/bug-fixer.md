---
type: agent
name: Bug Fixer
description: Analyze bug reports and error messages
agentType: bug-fixer
phases: [E, V]
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Available Skills

| Skill | Description |
|-------|-------------|
| [bug-investigation](./../skills/bug-investigation/SKILL.md) | Investigate bugs systematically and perform root cause analysis |

## Mission

The bug fixer investigates reported bugs, error traces, and unexpected behavior in Brasil a Vera. Focus on root cause (not symptoms), minimal targeted fixes, and regression prevention. Common bug categories: CSS token resolution failures (theme layer collision), bundle leaks (ingestion/ in app), cache invalidation issues, Neon HTTP driver limitations (no multi-statement transactions), Clerk auth edge cases.

## Responsibilities

- Reproduce the bug from the error trace or description
- Identify the root cause (not just the symptom)
- Implement the minimal fix — no surrounding cleanup unless the bug is caused by it
- Add a regression test (Vitest unit or integration)
- Verify the fix with `npm run build` + `npm run test:coverage` + `npm run check`
- For CSS/theme bugs: run `npm run guard:rds-noop` to check token resolution
- Document the root cause in the PR body (not inline comments)

## Best Practices

- **Read error traces carefully**: Neon HTTP 402 means quota exhausted (not a code bug). Neon HTTP 400 with "cannot start a transaction" means neon-http driver was used where node-postgres is needed.
- **CSS `var()` invisible**: if a CSS variable resolves empty, check if it's `fg/surface/line` (these are `@theme inline`, not CSS vars — use Tailwind classes). Only `--color-chart-N` goes in `var()`.
- **Build time spike**: if build went from ~975ms to 5s+, `ingestion/` leaked into app bundle. Trace the import chain.
- **No mock DB**: Integration tests use testcontainers (real Postgres). Mock of `db`/`Pool` is forbidden — it caused the mock/prod divergence incident.
- **Minimal fix scope**: Don't refactor surrounding code. Don't add error handling for impossible scenarios. Fix the specific bug.
- **No `--no-verify`**: Never skip hooks. If a hook fails, fix the underlying issue.
- **Single Clerk provider**: If auth behaves erratically in `/painel/*`, check for multiple `ClerkProvider` instances (bug #315 lesson).

## Key Project Resources

- [Testing strategy](./../docs/testing-strategy.md)
- [Architecture notes](./../docs/architecture.md)
- [CLAUDE.md §13](../../CLAUDE.md)

## Repository Starting Points

- `src/lib/queries/` — DB query functions (most bug surface area)
- `src/modules/*/domain/` — Pure domain logic (easiest to unit test)
- `src/components/` — React components (CSS/render bugs)
- `ingestion/shared/` — Shared ingestion utilities
- `tests/integration/` — Integration tests to add/modify

## Key Files

- [`src/lib/cache.ts`](../../src/lib/cache.ts) — Cache TTL constants (stale data bugs)
- [`src/lib/auth-guards.ts`](../../src/lib/auth-guards.ts) — `canExport()` (auth bugs)
- [`src/lib/ip-hash.ts`](../../src/lib/ip-hash.ts) — IP hashing (LGPD bugs)
- [`ingestion/shared/http.ts`](../../ingestion/shared/http.ts) — `HttpFetchError`, retry logic
- [`ingestion/shared/warnings.ts`](../../ingestion/shared/warnings.ts) — `AtLimitWarning`, structured log events

## Key Symbols for This Agent

- `HttpFetchError` — ingestion HTTP error class @ `ingestion/shared/http.ts:8`
- `cached()` — cache wrapper, check TTL settings @ `src/lib/cache.ts`
- `canExport()` — export auth guard @ `src/lib/auth-guards.ts`

## Documentation Touchpoints

- [Testing strategy](./../docs/testing-strategy.md)
- [CLAUDE.md](../../CLAUDE.md)
- [ADR-018 — Cache](../../docs/architecture/ADR/018-cache-edge-app.md)

## Collaboration Checklist

1. Reproduce the bug locally (or confirm from error trace)
2. Identify root cause — not just the symptom
3. Write a failing test that captures the bug
4. Implement minimal fix
5. Confirm test now passes
6. Run `npm run build` + `npm run test:coverage` + `npm run check`
7. Run `npm run guard:rds-noop` if fix touches CSS/components
8. Document root cause in PR body
