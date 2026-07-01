---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Tooling & Productivity Guide

All essential scripts are in `package.json`. The project uses Biome (not ESLint/Prettier) for lint/format, Drizzle Kit for DB management, and Wrangler for Cloudflare Workers preview/deploy.

## Required Tooling

- **Node.js 22** — Required version (matches Cloudflare Workers runtime)
- **npm 10** — Lockfile format requires npm 10. If local Node ≥ 23: `npx npm@10 install --package-lock-only`
- **Docker** — Required for local Postgres (`npm run db:local:up`) and integration tests (testcontainers)
- **Biome** — Lint + format: `npm run check` (dev) / `npm run ci` (strict, same as CI). Never ESLint/Prettier.
- **Drizzle Kit** — DB migrations: `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`
- **Wrangler** — Cloudflare Workers: `npm run cf:preview`, `npm run cf:deploy`
- **tsx** — Runs ingestion scripts: all `npm run ingest:*` commands use `tsx`
- **gh CLI** — GitHub operations: PRs, issues, workflow dispatch

## Recommended Automation

**Before every PR:**
```bash
npm run check        # Biome lint + format
npm run ci           # Biome strict (same as CI)
npm run test:coverage
npm run build        # Watch for bundle spikes
npm run guard:rds-noop && npm run guard:rds-primitive  # If touching components
```

**Database workflow:**
```bash
npm run db:local:up     # Start Docker Postgres
npm run db:migrate      # Apply pending migrations
npm run db:studio       # Open Drizzle Studio UI
npm run db:local:down   # Stop Docker Postgres
npm run db:local:reset  # Reset + re-seed (destructive)
```

**Ingestion (local testing):**
```bash
DATA_INICIO=2026-01-01 DATA_FIM=2026-01-31 npm run ingest:camara:votacoes
npm run ingest:print-matrix   # Show what GitHub Actions would schedule
```

**Cloudflare preview:**
```bash
npm run cf:build     # Build for Workers
npm run cf:preview   # Local Wrangler dev server
```

## IDE / Editor Setup

Recommended VS Code extensions:
- **Biome** (`biomejs.biome`) — lint + format on save. Add to workspace settings:
  ```json
  { "editor.defaultFormatter": "biomejs.biome", "editor.formatOnSave": true }
  ```
- **Drizzle** (`drizzle-team.drizzle-vscode`) — schema autocomplete
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — class autocompletion

## Productivity Tips

**npm proxy gotcha**: Local npm registry mirror at `localhost:4880` can corrupt `package-lock.json` with resolved localhost URLs. For any new dependency installation:
```bash
npm install --registry=https://registry.npmjs.org/ <package>
# Then fix lockfile if needed:
sed -i '' 's#http://localhost:4880/#https://registry.npmjs.org/#g' package-lock.json
```

**dotcontext harness**: `.context/` is the source of truth. Use MCP tools (`mcp__dotcontext__context`, `mcp__dotcontext__workflow-advance`) for navigation and workflow management. Skills available via `/<name>`: `/new-adr`, `/release-notes`, `/design-token-check`, `/visual-qa`.

**DB_DRIVER=pg**: When Neon free tier is exhausted, set `DB_DRIVER=pg` in `.env.local` to use local Docker Postgres (`npm run db:local:up`).

**Ingest matrix**: `npm run ingest:print-matrix` shows what the GitHub Actions cron will run — useful before modifying `ingestion/registry.ts`.

## Related Resources

- [Development Workflow](development-workflow.md)
- [CLAUDE.md](../../CLAUDE.md)
- [ADR-015 — DB driver split](../../docs/architecture/ADR/015-db-driver-split.md)
