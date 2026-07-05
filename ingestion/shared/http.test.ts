import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithRetry, HttpFetchError } from './http'

// Helper: dispara a chamada e avança os fake timers pelos sleeps de retry.
async function runExhaustingRetries(url: string): Promise<unknown> {
  const promise = fetchWithRetry(url).then(
    () => undefined,
    (err: unknown) => err,
  )
  await vi.runAllTimersAsync()
  return promise
}

describe('fetchWithRetry — diagnóstico de erro de rede', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('achata a cadeia de cause do undici na mensagem do erro final', async () => {
    const cause = Object.assign(new Error('connect ECONNRESET 1.2.3.4:443'), {
      code: 'ECONNRESET',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause })),
    )

    const err = await runExhaustingRetries('https://example.leg.br/api')

    expect(err).toBeInstanceOf(HttpFetchError)
    const httpErr = err as HttpFetchError
    expect(httpErr.message).toBe(
      'fetch failed <- connect ECONNRESET 1.2.3.4:443',
    )
    expect(httpErr.status).toBeUndefined()
    expect(httpErr.url).toBe('https://example.leg.br/api')
  })

  it('anexa o code quando a mensagem da causa não o contém', async () => {
    const cause = Object.assign(new Error('conexão recusada'), {
      code: 'ECONNREFUSED',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause })),
    )

    const err = await runExhaustingRetries('https://example.leg.br/api')

    expect((err as HttpFetchError).message).toBe(
      'fetch failed <- conexão recusada [ECONNREFUSED]',
    )
  })

  it('desce em AggregateError (Happy Eyeballs) até o primeiro erro real', async () => {
    const aggregate = new AggregateError(
      [
        Object.assign(new Error('connect ETIMEDOUT 10.0.0.1:443'), {
          code: 'ETIMEDOUT',
        }),
      ],
      '',
    )
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(new TypeError('fetch failed', { cause: aggregate })),
    )

    const err = await runExhaustingRetries('https://example.leg.br/api')

    expect((err as HttpFetchError).message).toBe(
      'fetch failed <- connect ETIMEDOUT 10.0.0.1:443',
    )
  })

  it('preserva HttpFetchError com status em erro HTTP não-retryable', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('nope', { status: 404, statusText: 'Not Found' }),
        ),
    )

    const err = await runExhaustingRetries('https://example.leg.br/404')

    expect(err).toBeInstanceOf(HttpFetchError)
    expect((err as HttpFetchError).status).toBe(404)
  })

  it('retorna a Response em caso de sucesso, sem interferência', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('ok', { status: 200 })),
    )

    const response = await fetchWithRetry('https://example.leg.br/ok')

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('ok')
  })
})
