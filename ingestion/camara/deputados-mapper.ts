import type { CamaraDeputadoListagem } from './deputados-schema'

// Linha pronta para INSERT na tabela `parlamentares.parlamentar`. Tipo
// explícito (em vez de inferir do schema Drizzle) para que esta função
// permaneça uma função pura, testável sem depender do schema runtime.
export interface ParlamentarRow {
  sourceId: string
  nome: string
  // Listagem `/deputados` não inclui nome civil nem CPF. Buscar no detalhe
  // (`/deputados/{id}`) em PR futuro se necessário.
  nomeCivil: null
  cpf: null
  casa: 'CAMARA' | 'SENADO'
  partidoSigla: string
  // Listagem só traz a sigla. partido_nome detalhado vem de `/partidos/{id}`
  // — TODO consultar separadamente se quisermos o nome completo.
  partidoNome: string
  uf: string
  urlFoto: string | null
  // A listagem `/deputados?idLegislatura=N` traz apenas mandatos ativos da
  // legislatura. Buscar situação real exige `/deputados/{id}` — assumimos
  // EXERCICIO até refinar.
  situacaoMandato: 'EXERCICIO'
  legislatura: number
  trustLevel: 'L1'
  sourceUrl: string
}

export function mapDeputadoListagem(
  input: CamaraDeputadoListagem,
): ParlamentarRow {
  return {
    sourceId: String(input.id),
    nome: input.nome,
    nomeCivil: null,
    cpf: null,
    casa: 'CAMARA',
    partidoSigla: input.siglaPartido,
    partidoNome: input.siglaPartido,
    uf: input.siglaUf.toUpperCase(),
    urlFoto: input.urlFoto ?? null,
    situacaoMandato: 'EXERCICIO',
    legislatura: input.idLegislatura,
    trustLevel: 'L1',
    sourceUrl: input.uri,
  }
}
