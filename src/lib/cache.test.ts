import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type CacheModule = typeof import('./cache')

function makeInMemoryCache() {
  const store = new Map<string, Response>()
  return {
    _store: store,
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

// vi.resetModules() + dynamic import isola o estado (counter, SCHEMA_VERSION
// lido na inicialização) entre testes — caso contrário hits/misses
// acumulariam de teste para teste.
async function loadFresh(): Promise<CacheModule> {
  vi.resetModules()
  return await import('./cache')
}

describe('cache module', () => {
  let mockCache: ReturnType<typeof makeInMemoryCache>

  beforeEach(() => {
    mockCache = makeInMemoryCache()
    Object.defineProperty(globalThis, 'caches', {
      value: { default: mockCache },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis as object, 'caches')
  })

  describe('cached', () => {
    it('chama o loader em cache miss e armazena o valor', async () => {
      const { cached, TTL, readCacheStats } = await loadFresh()
      const loader = vi.fn(async () => ({ value: 42 }))

      const result = await cached('key:miss', TTL.listagemFiltrada, loader)

      expect(result).toEqual({ value: 42 })
      expect(loader).toHaveBeenCalledTimes(1)
      expect(mockCache.put).toHaveBeenCalledTimes(1)
      expect(readCacheStats()).toMatchObject({ misses: 1, hits: 0 })
    })

    it('retorna do cache em hit, sem chamar o loader', async () => {
      const { cached, TTL, readCacheStats } = await loadFresh()
      const loader = vi.fn(async () => ({ value: 'first' }))

      await cached('key:hit', TTL.listagemFiltrada, loader)
      const second = await cached('key:hit', TTL.listagemFiltrada, loader)

      expect(second).toEqual({ value: 'first' })
      expect(loader).toHaveBeenCalledTimes(1)
      expect(readCacheStats()).toMatchObject({ misses: 1, hits: 1 })
    })

    it('propaga erro do loader sem cachear', async () => {
      const { cached, TTL, readCacheStats } = await loadFresh()
      const boom = new Error('loader-failed')
      const loader = vi.fn(async () => {
        throw boom
      })

      await expect(
        cached('key:err', TTL.listagemFiltrada, loader),
      ).rejects.toBe(boom)
      expect(mockCache.put).not.toHaveBeenCalled()
      expect(readCacheStats()).toMatchObject({ misses: 1 })
    })

    it('chama loader e incrementa bypass quando caches.default não existe', async () => {
      Reflect.deleteProperty(globalThis as object, 'caches')
      const { cached, TTL, readCacheStats } = await loadFresh()
      const loader = vi.fn(async () => 'pass-through')

      const result = await cached('key:bypass', TTL.listagemFiltrada, loader)

      expect(result).toBe('pass-through')
      expect(loader).toHaveBeenCalledTimes(1)
      expect(readCacheStats()).toMatchObject({ bypass: 1, hits: 0, misses: 0 })
    })

    it('cai para loader quando cache.match falha', async () => {
      const { cached, TTL, readCacheStats } = await loadFresh()
      mockCache.match.mockRejectedValueOnce(new Error('cache offline'))
      const loader = vi.fn(async () => 'fresh')

      const result = await cached('key:read-fail', TTL.listagemFiltrada, loader)

      expect(result).toBe('fresh')
      expect(loader).toHaveBeenCalledTimes(1)
      expect(readCacheStats()).toMatchObject({ errors: 1, misses: 1 })
    })

    it('retorna valor do loader mesmo se cache.put falhar', async () => {
      const { cached, TTL, readCacheStats } = await loadFresh()
      mockCache.put.mockRejectedValueOnce(new Error('cache full'))
      const loader = vi.fn(async () => 'fresh')

      const result = await cached(
        'key:write-fail',
        TTL.listagemFiltrada,
        loader,
      )

      expect(result).toBe('fresh')
      expect(readCacheStats()).toMatchObject({ errors: 1, misses: 1 })
    })

    it('inclui prefixo de versão de schema (vNNNN) na cache key', async () => {
      const { cached, TTL } = await loadFresh()
      await cached('key:schema', TTL.listagemFiltrada, async () => 'x')

      const call = mockCache.put.mock.calls[0]
      expect(call).toBeDefined()
      const reqArg = call?.[0] as Request | undefined
      expect(reqArg?.url).toMatch(/\/v\d{4}\//)
    })

    it('serializa Date como string ISO no round-trip (contrato documentado)', async () => {
      const { cached, TTL } = await loadFresh()
      const loader = vi.fn(async () => ({
        ts: new Date('2026-01-15T10:30:00Z'),
      }))

      await cached('key:date', TTL.listagemFiltrada, loader)
      const second = await cached('key:date', TTL.listagemFiltrada, loader)

      expect(second).toEqual({ ts: '2026-01-15T10:30:00.000Z' })
    })

    it('grava header cache-control com max-age correto', async () => {
      const { cached, TTL } = await loadFresh()
      await cached('key:ttl', TTL.parlamentarPerfil, async () => 1)

      const call = mockCache.put.mock.calls[0]
      expect(call).toBeDefined()
      const res = call?.[1] as Response | undefined
      expect(res?.headers.get('cache-control')).toBe(
        `max-age=${TTL.parlamentarPerfil}`,
      )
    })
  })

  describe('invalidate', () => {
    it('remove a entry do cache; próximo cached é miss', async () => {
      const { cached, invalidate, TTL, readCacheStats } = await loadFresh()
      const loader = vi
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce('v1')
        .mockResolvedValueOnce('v2')

      await cached('key:inv', TTL.listagemFiltrada, loader)
      await invalidate('key:inv')
      const after = await cached('key:inv', TTL.listagemFiltrada, loader)

      expect(after).toBe('v2')
      expect(loader).toHaveBeenCalledTimes(2)
      expect(readCacheStats()).toMatchObject({ misses: 2, hits: 0 })
    })

    it('é no-op quando caches.default não existe', async () => {
      Reflect.deleteProperty(globalThis as object, 'caches')
      const { invalidate } = await loadFresh()
      await expect(invalidate('any')).resolves.toBeUndefined()
    })
  })

  describe('readCacheStats', () => {
    it('retorna snapshot independente (mutar não afeta interno)', async () => {
      const { cached, TTL, readCacheStats } = await loadFresh()
      await cached('k', TTL.listagemFiltrada, async () => 1)

      const snap = readCacheStats()
      snap.hits = 9999
      expect(readCacheStats().hits).toBe(0)
    })
  })
})
