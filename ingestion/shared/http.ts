// HTTP helpers compartilhados pelos clientes das APIs oficiais. APIs públicas
// brasileiras são instáveis — retry com backoff e timeout não são opcionais
// (ver CLAUDE.md).

const RETRY_DELAYS_MS = [1_000, 5_000, 30_000] as const
const REQUEST_TIMEOUT_MS = 30_000

export class HttpFetchError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly url: string,
  ) {
    super(message)
    this.name = 'HttpFetchError'
  }
}

export interface FetchOptions {
  /** Headers adicionais. `Accept` deve sempre ser passado pelos clientes. */
  headers?: Record<string, string>
  /** Sinal externo de cancelamento. */
  signal?: AbortSignal
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// undici esconde a causa real de "fetch failed" (ECONNRESET, ETIMEDOUT,
// ENOTFOUND, TLS...) em `error.cause`, e os scripts logam só `err.message` —
// o incidente #688-#698 ficou indiagnosticável por isso. Achata a cadeia de
// causas numa mensagem única.
function describeFetchError(err: unknown): string {
  const parts: string[] = []
  let current: unknown = err
  for (let depth = 0; current instanceof Error && depth < 4; depth++) {
    const code =
      'code' in current && typeof current.code === 'string'
        ? current.code
        : undefined
    const message =
      current.message || (current instanceof AggregateError ? '' : current.name)
    parts.push(
      code && !message.includes(code) ? `${message} [${code}]` : message,
    )
    current =
      current instanceof AggregateError && current.errors.length > 0
        ? current.errors[0]
        : current.cause
  }
  return parts.filter((p) => p.length > 0).join(' <- ')
}

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal
    try {
      const response = await fetch(url, {
        headers: options.headers,
        signal,
      })
      clearTimeout(timeout)

      if (response.status === 429) {
        // Rate limit: respeita Retry-After se vier, senão usa backoff.
        const retryAfter = response.headers.get('retry-after')
        const waitMs = retryAfter
          ? Number(retryAfter) * 1_000
          : RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]
        await sleep(waitMs)
        continue
      }

      if (response.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
        lastError = new HttpFetchError(
          `Server error ${response.status}`,
          response.status,
          url,
        )
        await sleep(RETRY_DELAYS_MS[attempt])
        continue
      }

      if (!response.ok) {
        throw new HttpFetchError(
          `HTTP ${response.status} ${response.statusText}`,
          response.status,
          url,
        )
      }

      return response
    } catch (err) {
      clearTimeout(timeout)
      lastError = err
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt])
        continue
      }
      if (err instanceof HttpFetchError) {
        throw err
      }
      throw new HttpFetchError(describeFetchError(err), undefined, url)
    }
  }
  throw lastError ?? new HttpFetchError('Exhausted retries', undefined, url)
}
