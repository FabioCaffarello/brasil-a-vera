import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpClient } from '../http-client'

describe('HttpClient', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockFetch(response: unknown, status = 200) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(response),
      headers: new Headers(),
    })
  }

  function createClient(
    overrides?: Partial<ConstructorParameters<typeof HttpClient>[0]>,
  ) {
    return new HttpClient({
      baseUrl: 'https://api.example.com',
      maxRequestsPerSecond: 100,
      ...overrides,
    })
  }

  it('should make a GET request and return JSON', async () => {
    mockFetch({ dados: [1, 2, 3] })

    const result = await createClient().get<{ dados: number[] }>('/test')
    expect(result).toEqual({ dados: [1, 2, 3] })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('should append query params to URL', async () => {
    mockFetch({ ok: true })

    await createClient().get('/test', { foo: 'bar', baz: '123' })

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string
    expect(calledUrl).toContain('foo=bar')
    expect(calledUrl).toContain('baz=123')
  })

  it('should append array params with multiple values', async () => {
    mockFetch({ ok: true })

    await createClient().get('/test', { ano: ['2025', '2026'], itens: '100' })

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string
    expect(calledUrl).toContain('ano=2025')
    expect(calledUrl).toContain('ano=2026')
    expect(calledUrl).toContain('itens=100')
  })

  it('should send custom headers', async () => {
    mockFetch({ ok: true })

    await createClient({ headers: { Accept: 'application/json' } }).get('/test')

    const calledOptions = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit
    expect(calledOptions.headers).toEqual({ Accept: 'application/json' })
  })

  it('should throw on 4xx errors without retrying', async () => {
    mockFetch({}, 404)

    const client = createClient({ timeoutMs: 1000 })
    await expect(client.get('/test')).rejects.toThrow('HTTP 404')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('should retry on 5xx errors and succeed', async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({}),
          headers: new Headers(),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
      })
    })

    const client = createClient({ maxRetries: 3 })
    const result = await client.get<{ success: boolean }>('/test')
    expect(result).toEqual({ success: true })
    expect(callCount).toBe(3)
  }, 60000)

  it('should throw after max retries exceeded on 5xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
      headers: new Headers(),
    })

    const client = createClient({ maxRetries: 0 })

    await expect(client.get('/test')).rejects.toThrow('HTTP 500')
  })

  it('should handle 429 with Retry-After header', async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve({}),
          headers: new Headers({ 'Retry-After': '1' }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ ok: true }),
        headers: new Headers(),
      })
    })

    const client = createClient({ maxRetries: 3 })
    const result = await client.get<{ ok: boolean }>('/test')
    expect(result).toEqual({ ok: true })
    expect(callCount).toBe(2)
  }, 60000)

  it('should build correct URL from base and path', async () => {
    mockFetch({ ok: true })

    await createClient({ baseUrl: 'https://api.example.com/v2' }).get('/items')

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string
    expect(calledUrl).toBe('https://api.example.com/v2/items')
  })
})
