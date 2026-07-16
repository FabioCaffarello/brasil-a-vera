import { describe, expect, it } from 'vitest'

import {
  extrairDeputadoSourceId,
  mapFuncionarioCamara,
} from './comissionados-mapper'
import { camaraFuncionarioRecordSchema } from './comissionados-schema'

// Records literais do CSV real (probe Fase C, 2026-07-14).
const SP_GABINETE = {
  ponto: 'P_263202',
  codGrupo: '6',
  grupo: 'Secretário Parlamentar',
  nome: 'ABDOU SADDI WARESS',
  cargo: 'SP09C',
  lotacao: 'GAB. 4/511 - CÉLIO SILVEIRA',
  atoNomeacao: 'LEI',
  dataNomeacao: '2026-02-18',
  uriLotacao: 'https://dadosabertos.camara.leg.br/api/v2/deputados/178876',
}

const CNE_LIDERANCA = {
  ponto: 'P_120117',
  codGrupo: '2',
  grupo: 'Cargo de Natureza Especial',
  nome: 'MARIA APARECIDA MARQUES',
  cargo: 'CNE11',
  lotacao: 'UNIÃO/UNIÃO - LIDERANÇA DO UNIÃO BRASIL',
  atoNomeacao: 'ATO DO PRESIDENTE',
  dataNomeacao: '02/03/2022',
  uriLotacao: '',
}

function record(raw: Record<string, string>) {
  return camaraFuncionarioRecordSchema.parse(raw)
}

describe('extrairDeputadoSourceId', () => {
  it('extrai o id da uriLotacao da API v2', () => {
    expect(
      extrairDeputadoSourceId(
        'https://dadosabertos.camara.leg.br/api/v2/deputados/178876',
      ),
    ).toBe('178876')
  })

  it('null para lotação sem uri (efetivos, lideranças, órgãos)', () => {
    expect(extrairDeputadoSourceId('')).toBeNull()
    expect(extrairDeputadoSourceId('DETEC/CAEDI')).toBeNull()
    // Domínio inesperado nunca vira vínculo (fail-closed).
    expect(
      extrairDeputadoSourceId('https://example.com/api/v2/deputados/1'),
    ).toBeNull()
  })
})

describe('mapFuncionarioCamara', () => {
  it('mapeia secretário parlamentar lotado em gabinete', () => {
    expect(mapFuncionarioCamara(record(SP_GABINETE))).toEqual({
      deputadoSourceId: '178876',
      nome: 'ABDOU SADDI WARESS',
      grupo: 'Secretário Parlamentar',
      cargo: 'SP09C',
      ponto: 'P_263202',
    })
  })

  it('CNE lotado em gabinete de deputado ENTRA (é pessoal do gabinete)', () => {
    const cneGabinete = record({
      ...CNE_LIDERANCA,
      lotacao: 'GAB. 4/743 - NIKOLAS FERREIRA',
      uriLotacao: 'https://dadosabertos.camara.leg.br/api/v2/deputados/209787',
    })
    expect(mapFuncionarioCamara(cneGabinete)?.deputadoSourceId).toBe('209787')
  })

  it('CNE de liderança (sem uriLotacao) fica fora do recorte', () => {
    expect(mapFuncionarioCamara(record(CNE_LIDERANCA))).toBeNull()
  })

  it('cargo vazio vira null', () => {
    const semCargo = record({ ...SP_GABINETE, cargo: '' })
    expect(mapFuncionarioCamara(semCargo)?.cargo).toBeNull()
  })
})
