import { describe, expect, it } from 'vitest'

import { mapTseBem, parseDataBr, parseValorBrl } from './bem-mapper'

const SOURCE_URL =
  'https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2022.zip'

describe('parseValorBrl', () => {
  it('converte vírgula decimal para ponto', () => {
    expect(parseValorBrl('9645,00')).toBe('9645.00')
    expect(parseValorBrl('150000,00')).toBe('150000.00')
    expect(parseValorBrl('1083531773,61')).toBe('1083531773.61')
  })

  it('remove separador de milhar defensivamente', () => {
    expect(parseValorBrl('1.083.531.773,61')).toBe('1083531773.61')
  })
})

describe('parseDataBr', () => {
  it('DD/MM/YYYY → YYYY-MM-DD', () => {
    expect(parseDataBr('14/12/2022')).toBe('2022-12-14')
  })

  it('vazio/indefinido/inválido → null', () => {
    expect(parseDataBr('')).toBeNull()
    expect(parseDataBr(undefined)).toBeNull()
    expect(parseDataBr('2022-12-14')).toBeNull()
  })
})

describe('mapTseBem', () => {
  it('mapeia registro bruto do TSE para a row do banco (L1)', () => {
    expect(
      mapTseBem(
        {
          ANO_ELEICAO: '2022',
          SQ_CANDIDATO: '110001595906',
          NR_ORDEM_BEM_CANDIDATO: '6',
          CD_TIPO_BEM_CANDIDATO: '21',
          DS_TIPO_BEM_CANDIDATO: 'Veículo automotor terrestre',
          DS_BEM_CANDIDATO: 'Moto Honda Sahara 1999',
          VR_BEM_CANDIDATO: '9645,00',
          DT_ULT_ATUAL_BEM_CANDIDATO: '14/12/2022',
        },
        SOURCE_URL,
      ),
    ).toEqual({
      anoEleicao: 2022,
      sqCandidato: 110001595906,
      nrOrdemBem: 6,
      cdTipoBem: 21,
      dsTipoBem: 'Veículo automotor terrestre',
      dsBem: 'Moto Honda Sahara 1999',
      valorDeclarado: '9645.00',
      dtUltAtualizacao: '2022-12-14',
      trustLevel: 'L1',
      sourceUrl: SOURCE_URL,
    })
  })
})
