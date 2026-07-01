---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Project Overview

Brasil a Vera is a Brazilian political transparency platform that consolidates public data from the Legislative branch (Câmara dos Deputados, Senado Federal, TSE, Portal da Transparência) into an accessible interface for any citizen. Slogan: _"Você escolheu quem te representa. Agora veja o que ele faz."_ It is publicly auditable (PolyForm Noncommercial 1.0.0), donation-funded, and designed for near-zero operational cost.

> **Semantic Snapshot**: Use `context({ action: "getMap", section: "all" })` for generated stack, architecture layers, key files, and dependency hotspots.

## Quick Facts

- Root: `/Volumes/OWC Express 1M2/Develop/brasil-a-vera`
- Languages: TypeScript (strict mode), JavaScript
- Framework: Next.js 16 App Router
- Database: PostgreSQL on Neon (serverless, scale-to-zero)
- Deploy: Cloudflare Workers via `@opennextjs/cloudflare`
- Auth: Clerk (area logada `/painel/*`)
- ORM: Drizzle (schema + queries); raw SQL for migrations
- Lint/format: Biome (not ESLint/Prettier)
- Tests: Vitest + testcontainers

## Entry Points

- [`src/app/layout.tsx`](../../src/app/layout.tsx) — Root layout (ClerkProvider, theme)
- [`src/app/page.tsx`](../../src/app/page.tsx) — Home page
- [`src/app/parlamentares/page.tsx`](../../src/app/parlamentares/page.tsx) — Parliamentarian listing
- [`src/app/parlamentares/[id]/page.tsx`](../../src/app/parlamentares/%5Bid%5D/page.tsx) — Parliamentarian profile
- [`ingestion/registry.ts`](../../ingestion/registry.ts) — ETL pipeline registry (GitHub Actions matrix source of truth)
- [`src/app/api/health/route.ts`](../../src/app/api/health/route.ts) — Health probe (no DB, dynamic by design)

## Key Exports

- `src/lib/queries/` — All DB query functions (wrapped in `cached()` per ADR-018)
- `src/modules/*/domain/` — Pure domain logic (alinhamento, coerência, patrimônio, etc.)
- `src/shared/trust/` — Trust level system (L1-L4) for data provenance
- `ingestion/registry.ts` — `IngestionSource` type and registry array for CI orchestration
- `src/lib/auth-guards.ts` — `canExport()` for mass data export gating

## File Structure & Code Organization

- `src/app/` — Next.js App Router pages, API routes, authenticated area
- `src/components/` — React components (built on RDS compositions per ADR-053)
- `src/lib/` — Queries, cache, auth, CSV, RSS, LGPD, aggregators
- `src/modules/` — Bounded contexts with pure domain logic (8 modules)
- `src/shared/` — DB schema (Drizzle), trust types, domain events, federações
- `ingestion/` — ETL scripts: camara/, senado/, tse/, ops/, shared/
- `docs/architecture/ADR/` — Architectural Decision Records (53+)
- `src/shared/db/migrations/` — Versioned SQL migrations (raw SQL)
- `.claude/` — Claude Code harness (skills, hooks, agents)
- `.context/` — dotcontext harness (source of truth for agents/skills)
- `scripts/` — Build-time guards (rds-primitive-guard, rds-noop-guard, wcag-check)

## Technology Stack Summary

**Runtime**: Node.js 22 (ingestion) + Cloudflare Workers (app). **Language**: TypeScript strict mode throughout. **Framework**: Next.js 16 App Router with Parallel Routes for `/painel/*`. **Database**: Neon PostgreSQL — neon-http driver for app (no multi-statement transactions), node-postgres for ingestion (full transaction support). **ORM**: Drizzle for schema/queries; SQL puro for migrations. **Validation**: Zod at all external boundaries. **Lint/format**: Biome. **Tests**: Vitest + testcontainers (no DB mocking). **Deploy**: Cloudflare Workers via `@opennextjs/cloudflare` (not Vercel).

## Core Framework Stack

- **App**: Next.js 16 App Router — SSG + revalidate for profiles (no dynamic rendering per ADR-018), dynamic only for search/filters
- **Data**: Drizzle ORM + raw SQL migrations in `src/shared/db/migrations/`
- **Auth**: Clerk (single ClerkProvider in root layout — bug #315 lesson)
- **Design system**: `@fabio.caffarello/react-design-system` (strangler fig per ADR-033/038/053)
- **Charts**: Recharts (ADR-025)
- **Email**: Resend (`src/lib/resend-client.ts`)

## Getting Started Checklist

1. Install dependencies: `npm install`
2. Copy env: `cp .env.example .env.local` and fill secrets (DATABASE_URL, CLERK_*, RESEND_API_KEY)
3. Start local Postgres: `npm run db:local:up` (Docker Compose pg17)
4. Apply migrations: `npm run db:migrate`
5. Run dev server: `npm run dev`
6. Run tests: `npm run test`
7. Run linter: `npm run check`
8. View ingestion matrix: `npm run ingest:print-matrix`

## Related Resources

- [Architecture](architecture.md)
- [Development Workflow](development-workflow.md)
- [CLAUDE.md](../../CLAUDE.md)
- [Product Vision](../../docs/product/PRODUCT-VISION.md)
- [ADRs](../../docs/architecture/ADR/)
