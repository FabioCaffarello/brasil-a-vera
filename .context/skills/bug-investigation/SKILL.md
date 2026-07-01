---
type: skill
name: Bug Investigation
description: Investigate bugs systematically and perform root cause analysis. Use when Investigating reported bugs, Diagnosing unexpected behavior, or Finding the root cause of issues
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Reproduce the bug consistently — confirm in which environment (local `npm run dev`, Workers preview, production)
2. Classify the error type: Neon DB error, bundle/import error, CSS token issue, auth/Clerk error, or ingestion error
3. Collect the full stack trace or HTTP status — the error code is usually diagnostic
4. Check recent commits with `git log --oneline -20` to identify when the regression started
5. Form a hypothesis and verify it with a minimal reproduction (not a theoretical explanation)
6. Fix the root cause — never bypass with `--no-verify` or `try/catch` that swallows the error
7. Write a regression test before closing the bug

## Examples

**Neon error diagnosis:**
```
HTTP 402 from Neon → free-tier quota exhausted (not a code bug — wait for reset or check /api/health)
HTTP 400 "cannot start a transaction" → wrong driver: ingestion code (needs transactions)
  is using neon-http instead of node-postgres. Fix: use IngestDb from ingestion/shared/db.ts

HTTP 500 on a DB-backed route → likely the 402 cascade.
  Confirm: check /api/health (no DB) — if 200, DB quota is the culprit, not code.
```

**Build time spike diagnosis:**
```
npm run build → 5s (baseline is ~975ms)
→ ingestion/ leaked into app bundle
→ Trace: find the import chain from src/app/ that pulls ingestion/
→ Look for: a shared utility imported from both ingestion/ and src/
→ Fix: move to src/lib/ or add to serverExternalPackages in next.config.ts
```

**CSS token invisible element:**
```
Button primary is invisible (transparent background)
→ Check: is the component using var(--color-fg-primary) in inline style?
→ fg/surface/line/border tokens are @theme inline — they do NOT emit CSS vars
→ Fix: replace var(--color-fg-primary) with Tailwind class text-fg-primary
→ Only --color-chart-N is safe in var()
```

**npm lockfile corruption (localhost:4880):**
```
CI fails with ECONNREFUSED on npm install
→ A new dependency was installed through the local npm proxy mirror
→ Fix: sed 's#http://localhost:4880/#https://registry.npmjs.org/#g' package-lock.json
→ integrity hashes are unaffected — just the resolved URL changes
```

## Quality Bar

- Always reproduce before investigating — never debug from a description alone
- Classify error type first (Neon quota? driver mismatch? CSS var? bundle leak?) — each has a known fix pattern
- `git bisect` when the regression window is unclear (more than ~10 commits)
- Never fix with `try/catch` that swallows without logging — use structured `console.error` with context
- Write a regression test: the test must fail on the broken code and pass after the fix
- Check `/api/health` first when DB routes return 500 — it bypasses DB and confirms the scope of failure
- For Clerk/auth bugs: confirm there is exactly one ClerkProvider in `src/app/layout.tsx` (bug #315)

## Resource Strategy

- No extra scripts needed — the existing `npm run build`, `npm run dev`, and `npm run test:coverage` cover all diagnosis commands.
- Add a reference file only if the bug involves a complex external API shape that caused a mapper failure.
- Keep the skill file as the only resource for standard error pattern lookups.
