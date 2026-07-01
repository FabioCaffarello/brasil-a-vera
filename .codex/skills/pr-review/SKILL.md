---
name: pr-review
description: Review pull requests against team standards and best practices. Use when Reviewing a pull request before merge, Providing feedback on proposed changes, or Validating PR meets project standards
---

## Workflow

1. Read the PR description and linked issue — understand the goal and scope before reviewing code
2. Run `npm run ci` locally (or verify CI passes) — Biome strict is the non-negotiable gate
3. Check every new query in `src/lib/queries/` for `cached()` wrapper
4. Check every new component for RDS guard compliance: `npm run guard:rds-noop && npm run guard:rds-primitive`
5. Check every new API route for Zod validation on input and Clerk auth where appropriate
6. Check for `var(--color-fg-*)` / `var(--color-surface-*)` in inline styles — block if found
7. For new DB index: require `EXPLAIN ANALYZE` output in PR body
8. Verify `npm run build` baseline (~975ms) not spiked
9. Confirm no DB mocking in new tests — testcontainers only
10. Leave feedback with precise file + line references; classify as BLOCK or SUGGESTION

## Examples

**PR feedback — BLOCK:**
```
BLOCK: src/lib/queries/proposicoes.ts:87
New query function `getProposicoesByTema` is not wrapped in `cached()`.
All query functions consumed by Server Components must use cached() (ADR-018).
Fix: wrap with cached({ ttl: TtlKey.PROPOSICAO_LIST })
```

**PR feedback — SUGGESTION:**
```
SUGGESTION: src/components/parlamentar/financiamento.tsx:34
Card layout is reimplemented locally. RDS has a Card compound that does this
(ADR-053). Not a blocker for this PR, but file a follow-up issue to consolidate.
```

**PR approval:**
```
All checks pass:
- npm run ci ✓ (Biome)
- cached() on new queries ✓
- RDS guards ✓ (noop + primitive)
- build time ~975ms ✓
- testcontainers in new tests (no mocks) ✓
- Zod on external data boundary ✓

Approved.
```

## Quality Bar

- BLOCK is reserved for: missing `cached()`, DB mocking, CSS `var(--color-fg-*)` in inline styles, unvalidated external data, Biome failure, missing `EXPLAIN ANALYZE` for new index, secrets in code
- SUGGESTION is for: style preference, optional refactoring, RDS consolidation opportunities
- Never approve if `npm run ci` fails — Biome strict is the floor, not optional
- Never approve if a new DB-backed route has no `cached()` without explicit empirical justification
- The auto-merge (Wave 6) era is over — owner must merge; do not `gh pr merge`

## Resource Strategy

- No extra files needed — the review checklist is fully contained in this skill.
- The code-review SKILL.md has the detailed technical criteria; this skill focuses on the PR review process and feedback format.
