import { fetchWithRetry } from '../shared/http'

// Client da API administrativa aberta do Senado (adm.senado.gov.br) —
// host e prefixo DIFERENTES da API legislativa (legis.senado.leg.br, ver
// senado-client.ts). Fonte de dados de gestão: servidores, comissionados,
// remunerações, contratações. OpenAPI pública em /v3/api-docs; sem token.
// Descoberta no probe Fase C do ADR-064 E2 (2026-07-14).

const BASE_URL = 'https://adm.senado.gov.br/adm-dadosabertos/api/v1'

const USER_AGENT =
  'brasil-a-vera/0.1 (+https://github.com/FabioCaffarello/brasil-a-vera)'

const HEADERS = {
  accept: 'application/json',
  'user-agent': USER_AGENT,
}

export async function fetchSenadoAdmJson<T>(
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
