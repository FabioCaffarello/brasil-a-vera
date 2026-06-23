// Unidades da Federação (27) — sigla + nome + região. Fixo; usado pela porta de
// entrada "Quem me representa" (SSG por UF, agrupada por região) e onde precisar
// do nome por extenso.

export type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul'

export interface UF {
  sigla: string
  nome: string
  regiao: Regiao
}

export const UFS: readonly UF[] = [
  { sigla: 'AC', nome: 'Acre', regiao: 'Norte' },
  { sigla: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { sigla: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { sigla: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { sigla: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { sigla: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { sigla: 'PA', nome: 'Pará', regiao: 'Norte' },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { sigla: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { sigla: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { sigla: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'Norte' },
]

// Ordem de exibição das regiões (convenção IBGE: Norte → Sul).
export const REGIOES: readonly Regiao[] = [
  'Norte',
  'Nordeste',
  'Centro-Oeste',
  'Sudeste',
  'Sul',
]

const PORSIGLA = new Map(UFS.map((u) => [u.sigla, u]))

export function nomeUf(sigla: string): string | null {
  return PORSIGLA.get(sigla.toUpperCase())?.nome ?? null
}

export function isUfValida(sigla: string): boolean {
  return PORSIGLA.has(sigla.toUpperCase())
}

/**
 * Agrupa as UFs por região, na ordem de `REGIOES`, com as UFs já ordenadas
 * alfabeticamente por nome dentro de cada grupo. Usado pelo seletor agrupado
 * da porta de entrada "Quem me representa".
 */
export function ufsPorRegiao(): { regiao: Regiao; ufs: UF[] }[] {
  return REGIOES.map((regiao) => ({
    regiao,
    ufs: UFS.filter((u) => u.regiao === regiao).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    ),
  }))
}
