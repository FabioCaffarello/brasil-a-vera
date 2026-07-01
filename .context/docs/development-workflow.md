---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Development Workflow

Day-to-day work follows Conventional Commits, feature branches off `main`, and CI-gated PRs. Claude Code harness is managed via dotcontext (`.context/` as source of truth). No auto-merge in effect since Wave 6 ended 2026-06-10 — all merges require owner approval.

## Branching & Releases

- **Default branch**: `main` — protected, CI must pass
- **Feature branches**: `feat/<descricao>` — never commit directly to main
- **Fix branches**: `fix/<descricao>`
- **Chore/docs**: `chore/<descricao>`, `docs/<descricao>`
- **Releases**: tagged `vX.Y.Z` with release notes in `docs/releases/`
- **Commit style**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`)
- **PR requirement**: description mandatory, CI passing blocks merge, CODEOWNERS review required per area

## Local Development

- Install dependencies: `npm install`
- Start local Postgres (Docker): `npm run db:local:up`
- Apply migrations: `npm run db:migrate`
- Run dev server: `npm run dev`
- Build for production: `npm run build`
- Preview on Cloudflare Workers locally: `npm run cf:preview`
- Run tests (watch): `npm run test`
- Run tests with coverage: `npm run test:coverage`
- Run single test file: `npx vitest run src/path/to/file.test.ts`
- Run linter + formatter: `npm run check`
- Run CI-strict lint: `npm run ci`
- Run RDS guards: `npm run guard:rds-noop && npm run guard:rds-primitive`
- Check WCAG contrast: `npm run wcag:check`
- Inspect DB: `npm run db:studio`
- Print ingestion matrix: `npm run ingest:print-matrix`

**Local DB vs Neon**: Set `DB_DRIVER=pg` in `.env.local` to use local Docker Postgres instead of Neon (free tier quota exhausts). `DB_DRIVER=neon` (default) uses Neon HTTP.

## Code Review Expectations

PRs touching > 3 files require a plan first (CLAUDE.md). Every PR must include:

- **CI green**: Biome `npm run ci` + `npm run test:coverage` + `npm run build`
- **RDS guards green** for any component changes: `guard:rds-noop` + `guard:rds-primitive`
- **Empirical validation** (CLAUDE.md §13): cache behavior, latency, runtime claims must be confirmed with `curl`/script output in the PR body — not theoretical
- **ADR check**: architectural changes must align with existing ADRs or update them with justification
- **No `any`**: TypeScript strict, no `as` casts except `unknown → Zod-validated type`
- **No new ESLint/Prettier config**: Biome only
- **No secrets in repo**: `.env` is gitignored; GitHub Secrets for CI

**CODEOWNERS**: infra/DB changes → owner; design system → RDS path; ingestion → ingestion path.

## Key Operational Notes

- **Neon scale-to-zero**: Don't probe routes that touch DB outside ingestion windows. Health probe at `/api/health` hits no DB.
- **Build time canary**: Baseline ~975ms. Spikes indicate `ingestion/` leaked into app bundle.
- **CSS var gotcha**: Only `--color-chart-N` are CSS vars for inline styles. `fg/surface/line` tokens are `@theme inline` — use Tailwind classes, not `var(--color-fg-*)`.
- **npm install on local**: Local registry proxy at `localhost:4880` can corrupt lockfile with resolved URLs. Use `--registry=https://registry.npmjs.org/` for new deps, then fix with `sed`.

## Related Resources

- [Testing Strategy](testing-strategy.md)
- [Tooling](tooling.md)
- [CLAUDE.md](../../CLAUDE.md)
- [BRANCH-PROTECTION.md](../../docs/contributing/BRANCH-PROTECTION.md)
