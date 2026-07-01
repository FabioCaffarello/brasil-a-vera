---
type: skill
name: Refactoring
description: Refactor code safely with a step-by-step approach. Use when Improving code structure without changing behavior, Reducing code duplication, or Simplifying complex logic
skillSlug: refactoring
phases: [E]
generated: 2026-07-01
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Confirm the concrete pain point — ADR-019 requires an observed bottleneck, not aesthetic preference
2. Run `npm run test:coverage` — capture baseline before touching anything
3. Identify the single type of change (extract function, move file, rename, add `cached()` wrapper)
4. Make only that one change type in a single pass
5. Run `npm run check` (Biome) and `npm run test:coverage` — must still pass
6. Commit with a descriptive message (`refactor(scope): extract X to ingestion/shared/Y.ts`)
7. Repeat for the next distinct change type

## Examples

**Extract shared ingestion utility:**
```typescript
// Before: retry logic duplicated in ingestion/camara/proposicoes.ts AND ingestion/senado/proposicoes.ts
async function fetchWithRetry(url: string) {
  for (let i = 0; i < 3; i++) {
    try { return await fetch(url) } catch (e) { if (i === 2) throw e }
  }
}

// After: extracted to ingestion/shared/http.ts
// Both files import: import { fetchHttp } from '../shared/http'
// HttpFetchError and FetchOptions already exist there — use them
```

**Fix missing cached() wrapper:**
```typescript
// Before: query hits Neon on every request
export async function getVotacoesByParlamentar(id: number) {
  return db.select().from(votacoes).where(eq(votacoes.parlamentarId, id))
}

// After: wrapped with correct TTL tier
export const getVotacoesByParlamentar = cached(
  async (id: number) => db.select().from(votacoes).where(eq(votacoes.parlamentarId, id)),
  { ttl: TtlKey.VOTACAO_LIST }
)
```

**Split side-effect entry point from pure logic:**
```typescript
// Before: tests that import businessLogic.ts trigger main()
export function computeAlinhamento(votes: Vote[]): number { ... }
async function main() { const db = ...; await computeAlinhamento(...) }
main()  // ← runs on import!

// After: split into two files
// domain/alinhamento.ts — pure function, importable by tests
// scripts/run-alinhamento.ts — entry point with main(), DRY_RUN guard
```

## Quality Bar

- ADR-019 applies: no refactoring without an observed concrete problem
- Green tests before and after — if any test breaks, the refactoring changed behavior
- One type of change per commit — never rename + extract + move in one commit
- Biome strict (`npm run check`) must pass after every change
- Build canary must stay ~975ms (`npm run build`) — spike = ingestion leaked into bundle
- No `any` or `as` casts introduced — TypeScript strict stays strict
- Import boundaries enforced: `ingestion/` imports never appear in `src/`

## Resource Strategy

- No extra files needed — refactoring is verified by the existing test suite and guard scripts.
- If the refactoring moves a file that affects `ingestion/registry.ts`, document the change in the commit message body.
