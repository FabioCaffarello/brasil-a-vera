// Cliente HTTP mínimo para a API da Câmara dos Deputados.
// Responsável por: paginação por header Link, retry com backoff exponencial e
// rate limiting básico. APIs públicas brasileiras são instáveis — retry e
// log estruturado são obrigatórios (ver CLAUDE.md).

const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'
const USER_AGENT =
  'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)'

const RETRY_DELAYS_MS = [1_000, 5_000, 30_000] as const
const REQUEST_TIMEOUT_MS = 30_000

export class CamaraApiError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly url: string,
  ) {
    super(message)
    this.name = 'CamaraApiError'
  }
}

interface FetchOptions {
  signal?: AbortSignal
}

async function fetchWithRetry(
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
        headers: {
          accept: 'application/json',
          'user-agent': USER_AGENT,
        },
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
        // Erro do servidor — retry.
        lastError = new CamaraApiError(
          `Server error ${response.status}`,
          response.status,
          url,
        )
        await sleep(RETRY_DELAYS_MS[attempt])
        continue
      }

      if (!response.ok) {
        throw new CamaraApiError(
          `HTTP ${response.status} ${response.statusText}`,
          response.status,
          url,
        )
      }

      return response
    } catch (err) {
      clearTimeout(timeout)
      lastError = err
      // Timeout/network errors: retry com backoff.
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt])
        continue
      }
      throw err
    }
  }
  throw lastError ?? new CamaraApiError('Exhausted retries', undefined, url)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// O header `Link` da Câmara segue RFC 5988. Extraímos `rel="next"` quando existir.
function parseNextUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  // Formato: '<url>; rel="next", <url>; rel="last"'
  const parts = linkHeader.split(',')
  for (const part of parts) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/)
    if (match) return match[1]
  }
  return null
}

interface CamaraEnvelope<T> {
  dados: T
  links?: Array<{ rel: string; href: string }>
}

// Itera por todas as páginas de um endpoint que devolve `{ dados: T[] }`.
// Yielda os items individualmente para que o consumer possa processar em
// streaming sem materializar tudo em memória.
export async function* paginate<T>(
  path: string,
  params: Record<string, string | number> = {},
  options: FetchOptions = {},
): AsyncGenerator<T, void, void> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value))
  }
  let url: string | null = `${BASE_URL}${path}?${query.toString()}`
  while (url) {
    const response: Response = await fetchWithRetry(url, options)
    const json = (await response.json()) as CamaraEnvelope<T[]>
    if (!Array.isArray(json.dados)) {
      throw new CamaraApiError(
        'Resposta sem `dados` array',
        response.status,
        url,
      )
    }
    for (const item of json.dados) {
      yield item
    }
    url = parseNextUrl(response.headers.get('link'))
  }
}
