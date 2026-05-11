// Cliente da API do Senado Federal.
//
// Diferenças relevantes em relação à Câmara:
// - Não usa paginação (endpoint /lista/atual retorna ~81 senadores numa
//   resposta única).
// - `Accept: application/json` é obrigatório — sem isso a API retorna XML.
// - Estrutura nested verbose em estilo XML (envelopes do tipo
//   `{ "ListaX": { "Y": { "Z": [...] } } }`).

import { fetchWithRetry } from '../shared/http'

const BASE_URL = 'https://legis.senado.leg.br/dadosabertos'
const USER_AGENT =
  'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)'

const HEADERS = {
  accept: 'application/json',
  'user-agent': USER_AGENT,
} as const

export async function fetchSenadoJson<T>(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const response = await fetchWithRetry(url, {
    headers: HEADERS,
    signal: options.signal,
  })
  return (await response.json()) as T
}
