import { logger } from './logger'

export type HttpClientOptions = {
  baseUrl: string
  maxRequestsPerSecond?: number
  maxRetries?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

class HttpNonRetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HttpNonRetryableError'
  }
}

export class HttpClient {
  private readonly maxRequestsPerSecond: number
  private readonly maxRetries: number
  private readonly timeoutMs: number
  private readonly headers: Record<string, string>
  private requestCount = 0
  private requestTotal = 0
  private windowStart = 0

  constructor(private readonly options: HttpClientOptions) {
    this.maxRequestsPerSecond = options.maxRequestsPerSecond ?? 5
    this.maxRetries = options.maxRetries ?? 3
    this.timeoutMs = options.timeoutMs ?? 30000
    this.headers = options.headers ?? {}
  }

  async get<T>(
    path: string,
    params?: Record<string, string | string[]>,
  ): Promise<T> {
    const url = this.buildUrl(path, params)
    return this.fetchWithRetry<T>(url)
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | string[]>,
  ): string {
    const base = this.options.baseUrl.endsWith('/')
      ? this.options.baseUrl
      : `${this.options.baseUrl}/`
    const fullPath = path.startsWith('/') ? path.slice(1) : path
    const url = new URL(fullPath, base)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, v)
          }
        } else {
          url.searchParams.set(key, value)
        }
      }
    }
    return url.toString()
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now()

    if (now - this.windowStart >= 1000) {
      this.windowStart = now
      this.requestCount = 0
    }

    if (this.requestCount >= this.maxRequestsPerSecond) {
      const waitMs = 1000 - (now - this.windowStart)
      if (waitMs > 0) {
        await this.sleep(waitMs)
      }
      this.windowStart = Date.now()
      this.requestCount = 0
    }

    this.requestCount++
  }

  private async fetchWithRetry<T>(url: string): Promise<T> {
    const delays = [1000, 5000, 30000]

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.rateLimit()

      const start = Date.now()
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

        const response = await fetch(url, {
          headers: this.headers,
          signal: controller.signal,
        })

        clearTimeout(timeout)

        this.requestTotal++
        if (this.requestTotal % 50 === 0) {
          logger.info('HTTP progress', { totalRequests: this.requestTotal })
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitMs = retryAfter
            ? Number.parseInt(retryAfter, 10) * 1000
            : (delays[attempt] ?? 30000)
          logger.warn('Rate limited (429), waiting', { url, waitMs })
          await this.sleep(waitMs)
          continue
        }

        if (response.status >= 500 && attempt < this.maxRetries) {
          const waitMs = delays[attempt] ?? 30000
          logger.warn('Server error, retrying', {
            url,
            status: response.status,
            waitMs,
          })
          await this.sleep(waitMs)
          continue
        }

        if (!response.ok) {
          throw new HttpNonRetryableError(
            `HTTP ${response.status}: ${response.statusText} for ${url}`,
          )
        }

        return (await response.json()) as T
      } catch (error) {
        if (error instanceof HttpNonRetryableError) {
          throw error
        }

        const duration = Date.now() - start

        if (error instanceof DOMException && error.name === 'AbortError') {
          logger.warn('Request timed out', { url, timeoutMs: this.timeoutMs })
        }

        if (attempt < this.maxRetries) {
          const waitMs = delays[attempt] ?? 30000
          logger.warn('Request failed, retrying', {
            url,
            attempt,
            waitMs,
            error: error instanceof Error ? error.message : 'Unknown error',
            durationMs: duration,
          })
          await this.sleep(waitMs)
          continue
        }

        throw error
      }
    }

    throw new Error(`Max retries (${this.maxRetries}) exceeded for ${url}`)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
