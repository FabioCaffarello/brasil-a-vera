import { describe, expect, it } from 'vitest'

import { mapSenadorListagem } from './senadores-mapper'

describe('mapSenadorListagem', () => {
  it('mapeia a estrutura nested do Senado para a row canônica', () => {
    const row = mapSenadorListagem({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '5012',
        NomeParlamentar: 'Senador Exemplo',
        NomeCompletoParlamentar: 'Senador Exemplo da Silva',
        SiglaPartidoParlamentar: 'PT',
        UfParlamentar: 'SP',
        UrlFotoParlamentar:
          'https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5012.jpg',
        UrlPaginaParlamentar:
          'https://www25.senado.leg.br/web/senadores/senador/-/perfil/5012',
      },
      Mandato: {
        UfParlamentar: 'SP',
        PrimeiraLegislaturaDoMandato: { NumeroLegislatura: '56' },
        SegundaLegislaturaDoMandato: { NumeroLegislatura: '57' },
      },
    })

    expect(row).toEqual({
      sourceId: '5012',
      nome: 'Senador Exemplo',
      nomeCivil: 'Senador Exemplo da Silva',
      cpf: null,
      casa: 'SENADO',
      partidoSigla: 'PT',
      partidoNome: 'PT',
      uf: 'SP',
      urlFoto:
        'https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5012.jpg',
      situacaoMandato: 'EXERCICIO',
      legislatura: 57,
      trustLevel: 'L1',
      sourceUrl:
        'https://www25.senado.leg.br/web/senadores/senador/-/perfil/5012',
    })
  })

  it('usa apenas a Primeira legislatura quando não há Segunda', () => {
    const row = mapSenadorListagem({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '99',
        NomeParlamentar: 'X',
        SiglaPartidoParlamentar: 'XX',
        UfParlamentar: 'RJ',
      },
      Mandato: {
        PrimeiraLegislaturaDoMandato: { NumeroLegislatura: '57' },
      },
    })
    expect(row.legislatura).toBe(57)
  })

  it('lança erro quando não há legislatura informada', () => {
    expect(() =>
      mapSenadorListagem({
        IdentificacaoParlamentar: {
          CodigoParlamentar: '99',
          NomeParlamentar: 'X',
          SiglaPartidoParlamentar: 'XX',
          UfParlamentar: 'RJ',
        },
        Mandato: {},
      }),
    ).toThrow(/legislatura/i)
  })

  it('cai no sourceUrl construído quando não há UrlPaginaParlamentar', () => {
    const row = mapSenadorListagem({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '123',
        NomeParlamentar: 'Y',
        SiglaPartidoParlamentar: 'YY',
        UfParlamentar: 'BA',
      },
      Mandato: {
        PrimeiraLegislaturaDoMandato: { NumeroLegislatura: '57' },
      },
    })
    expect(row.sourceUrl).toBe(
      'https://legis.senado.leg.br/dadosabertos/senador/123',
    )
  })
})
