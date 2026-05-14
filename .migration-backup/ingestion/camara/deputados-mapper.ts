import type { ParlamentarRow } from '../shared/parlamentar-row'

import type { CamaraDeputadoListagem } from './deputados-schema'

// Mapeia o payload da listagem `/deputados` da Câmara para a row canônica.
// Função pura — testável sem banco/rede.
//
// Limitações conhecidas (campos preenchidos por padrão por não estarem na
// listagem; viriam de `/deputados/{id}`):
// - `nomeCivil`, `cpf`: null
// - `partidoNome`: usa a sigla como fallback
// - `situacaoMandato`: assume EXERCICIO (a listagem só traz ativos)
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
