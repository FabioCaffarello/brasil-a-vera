// Helpers de municípios IBGE para o fluxo `/o-meu-parlamentar`.
//
// O JSON ordenado por (UF, nome) vive em `./municipios-ibge.json` e é
// importado server-side. Não vai para o bundle do cliente — funções
// abaixo são consumidas em server components ou recebem subset já
// filtrado quando passadas como prop para client component.
//
// Sprint 3.1 Tarefa 1 — regenerar via `ingestion/ops/seed-municipios-ibge.ts`
// quando IBGE publicar alteração territorial.

import dataset from './municipios-ibge.json'

export interface Municipio {
  /** Código IBGE de 7 dígitos. */
  id: number
  nome: string
  /** Sigla de 2 caracteres (BR). */
  uf: string
}

const MUNICIPIOS = dataset as Municipio[]

// Tipos importáveis em qualquer ponto da app. UFs brasileiras.
export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const

export type Uf = (typeof UFS)[number]

const UF_NOMES_COMPLETOS: Record<Uf, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
}

export function isUf(value: unknown): value is Uf {
  return typeof value === 'string' && (UFS as readonly string[]).includes(value)
}

export function nomeUfCompleto(uf: Uf): string {
  return UF_NOMES_COMPLETOS[uf]
}

/**
 * Retorna municípios de uma UF, já ordenados por nome (PT-BR).
 * Subset suficientemente pequeno (8 a 853 municípios) para ser passado
 * como prop para o autocomplete client-side sem inflar payload.
 */
export function getMunicipiosByUf(uf: Uf): Municipio[] {
  // Lista já está pré-ordenada por (UF, nome) no JSON — basta filtrar.
  return MUNICIPIOS.filter((m) => m.uf === uf)
}

/**
 * Valida que um nome de município pertence à UF. Comparação case-insensitive
 * e acent-insensitive para tolerância de entrada (`saopaulo` casa com
 * `São Paulo`).
 */
export function findMunicipio(uf: Uf, nome: string): Municipio | null {
  const norm = normalize(nome)
  const candidates = getMunicipiosByUf(uf)
  return candidates.find((m) => normalize(m.nome) === norm) ?? null
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}
