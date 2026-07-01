---
type: skill
name: Security Audit
description: Review code and infrastructure for security weaknesses. Use when Reviewing code for security vulnerabilities, Assessing authentication/authorization, or Checking for OWASP top 10 issues
skillSlug: security-audit
phases: [R, V]
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Identify scope: new API route, export endpoint, auth change, LGPD compliance, or dependency audit
2. For every API route in `src/app/api/`: verify Clerk auth middleware is applied where needed
3. For every `/api/export/*` route: verify `canExport()` from `src/lib/auth-guards.ts` is called
4. Verify all external data (query params, request body, API responses) passes through Zod before domain logic
5. Check for PII in logs: no cleartext IPs, emails, or CPF numbers
6. For LGPD touchpoints: verify IP hashing → consent gate → erase → anonymize → weekly cron chain
7. Run `npm audit` if new dependencies were added
8. Document findings with severity (CRITICAL / HIGH / MEDIUM / LOW) and specific file:line

## Examples

**Export gating audit:**
```
Audit: src/app/api/export/parlamentares/route.ts

✓ canExport() called on line 12 before query
✓ Returns 401 for anonymous (not disabled button — never reaches DB)
✓ No rate limiting (LOW: acceptable for current scale, log for future)
✓ CSV export uses parameterized Drizzle query — no injection risk
```

**LGPD chain audit:**
```
LGPD compliance check:

1. IP capture: src/app/api/stats/route.ts:18
   → hashIp(ip, process.env.IP_HASH_SALT) ✓ (never cleartext)

2. Consent gate: src/components/painel/consent-gate/index.tsx
   → isPrivacyConsentCurrent() gates painel access ✓

3. Erase: src/app/api/painel/dados/erase/route.ts
   → anonymizeUser() deletes PII, keeps anonymized aggregate ✓

4. Weekly cron: src/app/api/cron/lgpd/run/route.ts
   → Runs cleanup; verifies with test: tests/integration/lgpd.test.ts ✓

FINDING (MEDIUM): IP_HASH_SALT is undefined in local dev (.env.local missing).
Hash falls back to empty string salt — IPs effectively unhashed locally.
Fix: document IP_HASH_SALT as required in .env.local.example
```

**Zod boundary violation:**
```
CRITICAL: src/app/api/painel/profile/route.ts:45
  const uf = req.body.uf  // ← unvalidated user input
  await db.update(profile).set({ uf })  // ← goes straight to DB

Fix: parse with UfSchema.parse(req.body.uf) before use
```

## Quality Bar

- CRITICAL: unvalidated user input reaching DB, missing auth on sensitive route, PII in cleartext logs
- HIGH: export endpoint accessible without `canExport()`, missing Zod on external API response
- MEDIUM: LGPD chain gap, weak secret management (missing from .env.example)
- LOW: no rate limiting, theoretical injection path that Drizzle actually prevents
- Drizzle parameterized queries are safe by default — only flag raw `sql` template tags with interpolation
- Single ClerkProvider is a hard requirement — multiple instances cause silent auth failures (bug #315)
- `npm run ci` (Biome) is a security-adjacent gate — it catches some unsafe patterns

## Resource Strategy

- No extra scripts needed — `npm audit` and existing Biome lint cover automated checks.
- Add a references file only if auditing a complex external integration (Clerk webhook verification, Resend webhook) where the external service's security docs are needed.
