// Cliente da API do Senado Federal.
//
// Endpoints em uso:
// - /senador/lista/atual — listagem de senadores (XML-style nested JSON).
// - /votacao — votações em plenário com votos nominais inline (JSON flat).
// - /processo — proposições/matérias (JSON flat, substitui /materia/atualizadas
//   descontinuado em 2026-02-01).
//
// Todos exigem `Accept: application/json` — sem isso a API responde XML.

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
