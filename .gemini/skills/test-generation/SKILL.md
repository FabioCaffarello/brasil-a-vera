---
name: test-generation
description: Generate comprehensive test cases for code. Use when Writing tests for new functionality, Adding tests for bug fixes (regression tests), or Improving test coverage for existing code
---

## Workflow

1. Identify whether the target is pure logic (unit test) or DB-dependent (integration test)
2. For pure logic: write test file alongside the source in `src/modules/.../domain/*.test.ts`
3. For queries/routes: write test in `tests/integration/` using testcontainers Postgres (never mock)
4. For regression tests: write the failing test first — confirm it fails — then fix the bug
5. For mapper tests: use representative raw API payloads including null/missing field edge cases
6. Run `npm run test:coverage` — all configured thresholds must pass
7. Verify the new test is deterministic (run twice, same result)

## Examples

**Unit test for pure domain function:**
```typescript
import { describe, it, expect } from 'vitest'
import { aggregatePatrimonio } from './patrimonio'

describe('aggregatePatrimonio', () => {
  it('sums bens across all pleitos', () => {
    const bens = [
      { tipo: 'Imóvel', valor: 500_000, ano: 2022 },
      { tipo: 'Veículo', valor: 80_000, ano: 2022 },
    ]
    const result = aggregatePatrimonio(bens)
    expect(result.totalDeclarado).toBe(580_000)
    expect(result.pleitos).toHaveLength(1)
  })

  it('returns zero for empty bens (deputado sem declaração)', () => {
    expect(aggregatePatrimonio([]).totalDeclarado).toBe(0)
  })

  it('handles null valor field from TSE CSV edge case', () => {
    const bens = [{ tipo: 'Imóvel', valor: null, ano: 2022 }]
    expect(aggregatePatrimonio(bens).totalDeclarado).toBe(0)
  })
})
```

**Integration test for query function (testcontainers):**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { getParlamentarById } from '../../src/lib/queries/parlamentares'

// See tests/integration/queries/comparar.integration.test.ts for full pattern
describe('getParlamentarById (integration)', () => {
  let container: StartedPostgreSqlContainer

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start()
    // run migrations, seed test data
  })

  afterAll(() => container.stop())

  it('returns null for unknown id', async () => {
    expect(await getParlamentarById(999999)).toBeNull()
  })
})
```

**Regression test pattern:**
```typescript
it('regression #427: parlamentar_id FK is populated after CPF backfill', async () => {
  // Seed: senador with CPF, tse_candidatura with same CPF, parlamentar_id = null
  // Run: backfillVotacaoProposicaoSenado()
  // Assert: tse_candidatura.parlamentar_id is now populated
  // This test failed before the fix in #427
})
```

## Quality Bar

- Never mock `db`, `Pool`, or database connection — testcontainers only (prior incident: mock passed, prod migration failed)
- Use `vitest` imports — never `jest.*`
- Pure function tests: no container, no async setup, just call the function
- Regression tests must fail on the unpatched code — prove the fix before merging
- Test the edge cases specific to Brazilian legislative data: null CPF (Senado has no CPF), empty vote sessions, multi-year TSE CSV with Latin-1 encoding
- Coverage thresholds in `vitest.config.ts` are enforced — new tests must not drop coverage
- Do NOT import ingestion entry points directly — only import the pure mapper/domain function

## Resource Strategy

- No extra scripts needed — `npm run test:coverage` runs all tests with coverage via `vitest.config.ts`.
- Add a fixtures folder alongside the test only for large API payload samples (e.g., 200-line TSE CSV) that make the test file unreadable inline.
