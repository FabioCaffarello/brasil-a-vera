---
type: doc
name: architecture
description: System architecture, layers, patterns, and design decisions
category: architecture
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Architecture Notes

Brasil a Vera is a Next.js 16 App Router monolith deployed to Cloudflare Workers via `@opennextjs/cloudflare`. The system has two distinct runtime contexts that must never bleed into each other: the **Next.js app** (Cloudflare Workers, neon-http driver, no multi-statement transactions) and the **ingestion scripts** (Node.js, node-postgres driver, full transaction support).

All data flows from public Brazilian government APIs (Câmara, Senado, TSE, Portal da Transparência) through ETL scripts in `ingestion/` into a PostgreSQL database on Neon. The Next.js app reads from Neon via server components and edge-cached queries.

## System Architecture Overview

The system is a **read-heavy monolith** with a separate ingestion pipeline:

- **Ingestion** (GitHub Actions cron): TypeScript ETL scripts in `ingestion/` fetch from public APIs, validate with Zod, and upsert into Neon via `node-postgres`. Orchestrated via `ingestion/registry.ts` (single source of truth for the CI matrix).
- **App** (Cloudflare Workers): Next.js App Router server components query Neon via `@neondatabase/serverless` (HTTP driver). All queries in `src/lib/queries/` use `cached()` from ADR-018 (edge + app cache). Deploys via `@opennextjs/cloudflare`.
- **Auth** (Clerk): `/painel/*` routes are gated by Clerk middleware. Area logada uses Parallel Routes for tab-based navigation without full page reloads.

## Architectural Layers

- **Domain modules** (`src/modules/*/domain/`): Pure functions — no IO, no framework imports. Alinhamento, coerência, patrimônio, etc. are calculated here.
- **Queries** (`src/lib/queries/`): Drizzle + raw SQL queries against Neon. All wrapped in `cached()` per ADR-018. No direct DB calls from components.
- **Components** (`src/components/`, `src/app/`): Next.js App Router pages and React Server Components. Domain components are built on top of `@fabio.caffarello/react-design-system` compositions (ADR-053).
- **Ingestion** (`ingestion/`): Standalone Node.js ETL. Registry-driven (`ingestion/registry.ts`). Uses `node-postgres` for transactions. Must never be imported by app bundle.
- **Shared** (`src/shared/`): Trust level system, DB schema (Drizzle), domain event types. Cross-cutting concerns only.

## Detected Design Patterns

| Pattern | Confidence | Locations | Description |
|---------|------------|-----------|-------------|
| Repository | 90% | `src/lib/queries/**` | All DB queries centralized, cached, never called from UI directly |
| Pure domain functions | 95% | `src/modules/*/domain/` | Zero IO, testable in isolation |
| Zod boundary validation | 95% | All API schemas, `ingestion/*/schema.ts` | Every external datum validated before touching domain |
| ETL registry | 85% | `ingestion/registry.ts` | Single Zod-validated source of truth for GitHub Actions matrix |
| Strangler fig | 80% | `src/design-system/`, `scripts/rds-primitive-guard.ts` | ADR-038/053 consolidation of local primitives into RDS |
| Trust pyramid | 85% | `src/shared/trust/`, `trust_level` columns | L1-L4 per aggregate root, inherited by child rows |

## Entry Points

- [`src/app/layout.tsx`](../../src/app/layout.tsx) — Root Next.js layout with ClerkProvider, theme setup
- [`src/app/page.tsx`](../../src/app/page.tsx) — Home page
- [`src/app/parlamentares/[id]/page.tsx`](../../src/app/parlamentares/%5Bid%5D/page.tsx) — Parlamentar profile (highest traffic)
- [`ingestion/registry.ts`](../../ingestion/registry.ts) — Ingestion pipeline source of truth
- [`ingestion/ops/smoke.ts`](../../ingestion/ops/smoke.ts) — Post-deploy smoke probes

## Public API

| Symbol | Type | Location |
|--------|------|----------|
| `trust_level` | Column enum L1-L4 | `src/shared/trust/types.ts` |
| `cached()` | Cache wrapper | `src/lib/cache.ts` |
| `IngestionSource` | Registry type | `ingestion/registry.ts` |
| `canExport()` | Auth guard | `src/lib/auth-guards.ts` |
| `hashIp()` | LGPD util | `src/lib/ip-hash.ts` |

## Internal System Boundaries

**App ↔ Ingestion**: The app bundle must never import `ingestion/`. Build time is the canary — spikes from ~975ms to 5s+ indicate a leaked import. `next.config.ts` has a `serverExternalPackages` guard.

**DB drivers**: App uses `@neondatabase/serverless` (HTTP, no multi-statement transactions). Ingestion uses `node-postgres` (TCP, full transaction support). The split is enforced by `DB_DRIVER` env var in local dev (ADR-015 extended).

**Auth boundary**: Anonymous users see all public data. `/painel/*` requires Clerk session. Export endpoints (`/api/export/*`) are public by URL but `canExport()` gates them server-side.

## External Service Dependencies

- **Neon** (PostgreSQL): Primary DB. Free tier, scale-to-zero. HTTP driver for app, TCP for ingestion. Budget alerts in `ingestion/ops/neon-budget.ts`.
- **Cloudflare Workers**: Runtime + CDN. Edge cache via `cf-cache-status`. Deploy via `wrangler`.
- **Clerk**: Auth for `/painel/*`. ClerkProvider in root layout (single instance — learned from bug #315).
- **Resend**: Transactional email for weekly digest alerts. `src/lib/resend-client.ts`.
- **APIs Câmara** (`dadosabertos.camara.leg.br`): Unstable. Always retry with backoff. Log structured failures.
- **APIs Senado** (`legis.senado.leg.br`): Unstable. Same policy as Câmara.
- **TSE** (`resultados.tse.jus.br`): CSV bulk downloads, Latin-1 encoding, multiline fields.

## Key Decisions & Trade-offs

- **Cloudflare Workers over Vercel** (ADR-009): Near-zero cost, global edge. Trade-off: no Node.js runtime APIs.
- **Neon over Supabase** (ADR-003): No vendor lock-in on pooler. Trade-off: manual connection pooling.
- **Cursor pagination** (ADR-026/028): Stable URLs for sharing. Trade-off: no random page access.
- **SSG + revalidate over dynamic** (CLAUDE.md §9): Keeps Neon cold. Trade-off: 5-min staleness on listings.
- **RDS design system** (ADR-033/038/053): Component consolidation with strangler fig. Trade-off: upstream dependency on `@fabio.caffarello/react-design-system`.

## Top Directories Snapshot

- `src/app/` — ~80 route files (App Router pages + API routes)
- `src/components/` — ~120 React component files
- `src/lib/` — ~60 utility files (queries, cache, auth, CSV, RSS)
- `src/modules/` — ~40 domain logic files (8 bounded contexts)
- `src/shared/` — ~20 cross-cutting files (DB schema, trust, domain events)
- `ingestion/` — ~80 ETL script files (camara, senado, tse, ops, shared)
- `docs/architecture/ADR/` — 53+ accepted ADRs
- `src/shared/db/migrations/` — versioned SQL migrations

## Related Resources

- [Project Overview](project-overview.md)
- [Development Workflow](development-workflow.md)
- [ADR Index](../../docs/architecture/ADR/)
- [CLAUDE.md](../../CLAUDE.md)
