import { describe, expect, it } from 'vitest'

import { mapDeputadoListagem } from './deputados-mapper'

describe('mapDeputadoListagem', () => {
  it('mapeia campos da listagem da Câmara para a row do schema', () => {
    const result = mapDeputadoListagem({
      id: 178957,
      nome: 'Dep. Exemplo',
      siglaPartido: 'PT',
      siglaUf: 'SP',
      idLegislatura: 57,
      urlFoto: 'https://www.camara.leg.br/foto.jpg',
      uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/178957',
    })

    expect(result).toEqual({
      sourceId: '178957',
      nome: 'Dep. Exemplo',
      nomeCivil: null,
      cpf: null,
      casa: 'CAMARA',
      partidoSigla: 'PT',
      partidoNome: 'PT',
      uf: 'SP',
      urlFoto: 'https://www.camara.leg.br/foto.jpg',
      situacaoMandato: 'EXERCICIO',
      legislatura: 57,
      trustLevel: 'L1',
      sourceUrl: 'https://dadosabertos.camara.leg.br/api/v2/deputados/178957',
    })
  })

  it('normaliza UF para uppercase', () => {
    const result = mapDeputadoListagem({
      id: 1,
      nome: 'X',
      siglaPartido: 'PT',
      siglaUf: 'sp',
      idLegislatura: 57,
      uri: 'https://example.com/1',
    })
    expect(result.uf).toBe('SP')
  })

  it('preserva urlFoto null/undefined como null', () => {
    const result = mapDeputadoListagem({
      id: 1,
      nome: 'X',
      siglaPartido: 'PT',
      siglaUf: 'SP',
      idLegislatura: 57,
      uri: 'https://example.com/1',
    })
    expect(result.urlFoto).toBeNull()
  })
})
