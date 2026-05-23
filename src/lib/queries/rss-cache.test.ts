import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock estático do módulo `db`. Cada chamada terminal (`.limit(n)`) cria
// uma nova `Promise` resolvida com [] — basta para validar que o
// `cached()` chama o loader uma única vez. Não testamos o SQL gerado;
// para isso há os integration tests em `tests/integration/queries/`.
const dbSelectSpy = vi.fn(() => {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.innerJoin = vi.fn(() => chain)
  chain.orderBy = vi.fn(() => chain)
  chain.limit = vi.fn(async () => [])
  return chain
})

vi.mock('@/shared/db', () => ({
  db: {
    select: dbSelectSpy,
    selectDistinct: dbSelectSpy,
  },
}))

function makeInMemoryCache() {
  const store = new Map<string, Response>()
  return {
    match: vi.fn(async (req: Request) => {
      const entry = store.get(req.url)
      return entry ? entry.clone() : undefined
    }),
    put: vi.fn(async (req: Request, res: Response) => {
      store.set(req.url, res.clone())
    }),
    delete: vi.fn(async (req: Request) => store.delete(req.url)),
  }
}

// Mesma estratégia do cache.test.ts: dynamic import + resetModules pra
// que o counter interno de stats e a leitura de schema version partam
// do zero em cada teste.
async function loadFreshRss() {
  vi.resetModules()
  return await import('@/lib/rss/queries')
}

describe('rss queries caching', () => {
  let mockCache: ReturnType<typeof makeInMemoryCache>

  beforeEach(() => {
    mockCache = makeInMemoryCache()
    Object.defineProperty(globalThis, 'caches', {
      value: { default: mockCache },
      configurable: true,
      writable: true,
    })
    dbSelectSpy.mockClear()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis as object, 'caches')
  })

  it('getRssVotacoesGlobal: segunda chamada com mesmos args é cache hit (loader não roda)', async () => {
    const { getRssVotacoesGlobal } = await loadFreshRss()

    await getRssVotacoesGlobal(20)
    const dbCallsAfterFirst = dbSelectSpy.mock.calls.length

    await getRssVotacoesGlobal(20)
    const dbCallsAfterSecond = dbSelectSpy.mock.calls.length

    expect(dbCallsAfterFirst).toBe(1)
    expect(dbCallsAfterSecond).toBe(1)
    expect(mockCache.put).toHaveBeenCalledTimes(1)
  })

  it('getRssVotacoesGlobal: limits diferentes geram keys diferentes (cache miss)', async () => {
    const { getRssVotacoesGlobal } = await loadFreshRss()

    await getRssVotacoesGlobal(20)
    await getRssVotacoesGlobal(50)

    expect(dbSelectSpy.mock.calls.length).toBe(2)
    expect(mockCache.put).toHaveBeenCalledTimes(2)
  })
})
