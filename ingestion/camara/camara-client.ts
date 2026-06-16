// Cliente da API da Câmara dos Deputados — paginação por header Link.
// Retry/backoff/timeout estão em ingestion/shared/http.ts.

import { fetchWithRetry, HttpFetchError } from '../shared/http'

const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'
const USER_AGENT =
  'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)'

const HEADERS = {
  accept: 'application/json',
  'user-agent': USER_AGENT,
} as const

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

// GET único para endpoints de detalhe (ex.: /deputados/{id}) que devolvem
// `{ dados: {...} }`. Retorna o JSON cru (unknown) — a validação Zod fica no
// boundary do consumer (princípio 2).
export async function fetchJson(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<unknown> {
  const response = await fetchWithRetry(`${BASE_URL}${path}`, {
    headers: HEADERS,
    signal: options.signal,
  })
  return response.json()
}

// Itera por todas as páginas de um endpoint que devolve `{ dados: T[] }`.
// Yielda os items individualmente para que o consumer possa processar em
// streaming sem materializar tudo em memória.
export async function* paginate<T>(
  path: string,
  params: Record<string, string | number> = {},
  options: { signal?: AbortSignal } = {},
): AsyncGenerator<T, void, void> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value))
  }
  let url: string | null = `${BASE_URL}${path}?${query.toString()}`
  while (url) {
    const response: Response = await fetchWithRetry(url, {
      headers: HEADERS,
      signal: options.signal,
    })
    const json = (await response.json()) as CamaraEnvelope<T[]>
    if (!Array.isArray(json.dados)) {
      throw new HttpFetchError(
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
