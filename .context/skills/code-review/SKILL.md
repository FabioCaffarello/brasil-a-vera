---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices. Use when Reviewing code changes for quality, Checking adherence to coding standards, or Identifying potential bugs or issues
skillSlug: code-review
phases: [R, V]
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Read the PR description to understand the goal and scope
2. Verify `npm run ci` passes (Biome strict — the CI gate; not ESLint)
3. For every new query function in `src/lib/queries/`: confirm it is wrapped with `cached()`
4. For every new UI component: run guard checks (`npm run guard:rds-noop && npm run guard:rds-primitive`)
5. For every new API route: confirm Zod validation on inputs and auth check where needed
6. For ingestion changes: confirm idempotence (`ON CONFLICT DO UPDATE` or `DELETE + INSERT` in transaction)
7. For new aggregate root tables: confirm `trust_level`, `source_url`, `ingested_at` columns are present
8. Check build time impact (`npm run build` baseline is ~975ms — spike = ingestion bundle leak)
9. Confirm no DB mocking in new tests — testcontainers only

## Examples

**Missing cached() wrapper — block:**
```typescript
// WRONG — query hits Neon on every request, no cache
export async function getParlamentares(): Promise<Parlamentar[]> {
  return db.select().from(parlamentares)
}

// CORRECT — cached with appropriate TTL tier
export const getParlamentares = cached(
  async (): Promise<Parlamentar[]> => db.select().from(parlamentares),
  { ttl: TtlKey.PARLAMENTAR_LIST }
)
```

**CSS var() red flag — block:**
```tsx
// WRONG — fg/surface tokens are @theme inline, not CSS custom properties
<div style={{ color: 'var(--color-fg-primary)' }}>

// CORRECT — Tailwind class resolves correctly
<div className="text-fg-primary">

// ALLOWED — chart tokens ARE emitted as CSS vars
<circle fill={`var(--color-chart-${idx})`} />
```

**Empirical evidence requirement — block:**
```
PR adds DB index without EXPLAIN ANALYZE output
→ BLOCK: ADR-017 requires EXPLAIN ANALYZE proving the query needs it
→ Every index is permanent write overhead

PR claims "edge cache will handle this" without curl output
→ BLOCK: CLAUDE.md §13 requires curl evidence for cache behavior claims
```

## Quality Bar

- `npm run ci` must pass — Biome strict is non-negotiable (not ESLint, not Prettier)
- Every query in `src/lib/queries/` consumed by a Server Component needs `cached()` — no exceptions without empirical justification in the PR
- No DB mocking in tests — testcontainers only (prior incident: mock passed, prod migration failed)
- CSS `var(--color-fg-*)`, `var(--color-surface-*)`, `var(--color-line-*)` in inline styles = block (they're `@theme inline`, emit nothing)
- New DB indices need `EXPLAIN ANALYZE` output in the PR body (ADR-017)
- Cache/CDN/runtime behavior claims need `curl` evidence in the PR body (CLAUDE.md §13)
- LGPD: IP must be hashed before storage; new user data fields need LGPD analysis
- RDS compositiva layer (ADR-053): domain components must use RDS Card/Timeline/Breadcrumb/Avatar, not reinvent layout
- No `any`, no unvalidated `as` casts (only `as` after Zod `.parse()` is acceptable)

## Resource Strategy

- No extra files needed — all checks are run via npm scripts already in the project.
- Keep this skill as the single reference for review criteria and block conditions.
