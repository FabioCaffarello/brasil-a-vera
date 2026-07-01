---
type: doc
name: security
description: Security policies, authentication, secrets management, and compliance requirements
category: security
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---

## Security & Compliance Notes

Brasil a Vera handles publicly available legislative data, but has an authenticated area (`/painel/*`) with personal user data subject to LGPD. The main security surface areas are: Clerk auth, Neon DB access, Resend email, and IP hashing for LGPD compliance.

## Authentication & Authorization

- **Provider**: Clerk (`@clerk/nextjs`). Single `ClerkProvider` in root layout — critical invariant (bug #315 from multiple providers).
- **Session**: Clerk JWT, validated server-side via `auth()` helper in Server Components and Route Handlers.
- **Role model**: No RBAC beyond `authenticated vs anônimo`. Admin operations use `src/lib/admin-auth.ts` with a secret env var check.
- **Export gating**: `canExport()` in `src/lib/auth-guards.ts` — called server-side before any mass data export. Anônimo users never see the export button (not just disabled — hidden). Export API endpoints (`/api/export/*`) remain publicly addressable by URL but are protected server-side.
- **Area logada**: `/painel/*` and `/sign-in`, `/sign-up` routes. Clerk middleware redirects unauthenticated users.

## Secrets & Sensitive Data

**Never in repo**:
- `.env`, `.env.local`, `.dev.vars` are gitignored
- `.claude/settings.json` deny list blocks editing `.env*` files
- GitHub Secrets for CI (CLERK_*, DATABASE_URL, RESEND_API_KEY, IP_HASH_SALT)

**Secret locations**:
- Cloudflare Workers: Wrangler secrets (`wrangler secret put`) for DATABASE_URL, CLERK_SECRET_KEY
- GitHub Actions: Repository secrets for all ingestion credentials
- Local dev: `.env.local` (never committed)

**IP hashing**: User IPs are hashed with HMAC-SHA256 + `IP_HASH_SALT` before any storage (LGPD compliance). Implementation: `src/lib/ip-hash.ts`. Salt rotates on demand; hashed IPs cannot be reversed to original IPs.

**User data**: Personal data in `usuario` table (email, UF, preferences, consent). LGPD right-to-erasure implemented via `/api/painel/dados/erase` and `/api/painel/dados/anonimizar`. Anonymization: replaces PII with hashed identifiers, preserving aggregate stats.

## Compliance & Policies

- **LGPD** (Lei Geral de Proteção de Dados): Applies to `/painel/*` user data. Consent gate at onboarding. Data export, erasure, and anonymization endpoints implemented. Weekly LGPD cron (`/api/cron/lgpd/run`) handles retention enforcement.
- **PolyForm Noncommercial 1.0.0**: Project license — publicly auditable, donations funded, non-commercial use only.
- **No secrets in Claude Code context**: `.claude/settings.json` deny list prevents reading `.env*`. Hooks enforce this at PreToolUse time.

## Incident Response

- **Observability**: `/api/health` (no DB hit — for uptime monitoring), `/api/stats` (DB metrics), smoke probes in `ingestion/ops/smoke.ts` (run post-deploy via GitHub Actions)
- **Budget alerts**: `ingestion/ops/neon-budget.ts` polls Neon storage metrics and notifies on approaching free-tier limits
- **On-call**: Solo project (1 developer — Fabio Caffarello). No PagerDuty. GitHub Issues for incident tracking.
- **Rollback**: Cloudflare Workers has instant rollback via `wrangler rollback`. DB migrations are additive-only (no destructive schema changes without explicit down migration).

## Related Resources

- [Architecture](architecture.md)
- [ADR-030 — LGPD](../../docs/architecture/ADR/030-lgpd-compliance.md)
- [ADR-029 — Auth](../../docs/architecture/ADR/029-clerk-auth.md)
