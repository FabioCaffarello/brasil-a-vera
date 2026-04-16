import { HttpClient } from '../shared/http-client'

export const senadoClient = new HttpClient({
  baseUrl: 'https://legis.senado.leg.br/dadosabertos',
  maxRequestsPerSecond: 3,
  headers: {
    Accept: 'application/json',
  },
})
