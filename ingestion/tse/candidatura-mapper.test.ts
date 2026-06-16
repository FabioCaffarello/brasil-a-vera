import { describe, expect, it } from 'vitest'

import { mapTseCandidatura } from './candidatura-mapper'

const SOURCE_URL =
  'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip'

const base = {
  ANO_ELEICAO: '2022',
  SQ_CANDIDATO: '110001595906',
  CD_CARGO: '6',
  DS_CARGO: 'DEPUTADO FEDERAL',
  NM_CANDIDATO: 'FULANO DE TAL',
  SG_UF: 'MT',
  SG_UE: 'MT',
  DS_SITUACAO_CANDIDATURA: 'APTO',
}

describe('mapTseCandidatura', () => {
  it('mapeia registro e normaliza CPF de 11 dígitos', () => {
    expect(
      mapTseCandidatura(
        { ...base, NR_CPF_CANDIDATO: '00025085247' },
        SOURCE_URL,
      ),
    ).toEqual({
      anoEleicao: 2022,
      sqCandidato: 110001595906,
      cpf: '00025085247',
      cdCargo: 6,
      dsCargo: 'DEPUTADO FEDERAL',
      nmCandidato: 'FULANO DE TAL',
      sgUf: 'MT',
      sgUe: 'MT',
      dsSituacaoCandidatura: 'APTO',
      trustLevel: 'L1',
      sourceUrl: SOURCE_URL,
    })
  })

  it('sentinela de CPF do TSE vira null (não-vinculável)', () => {
    expect(
      mapTseCandidatura({ ...base, NR_CPF_CANDIDATO: '-4' }, SOURCE_URL).cpf,
    ).toBeNull()
    expect(mapTseCandidatura(base, SOURCE_URL).cpf).toBeNull()
  })
})
