import { HttpClient } from '../shared/http-client'

export const camaraClient = new HttpClient({
  baseUrl: 'https://dadosabertos.camara.leg.br/api/v2',
  maxRequestsPerSecond: 5,
  headers: {
    Accept: 'application/json',
  },
})
