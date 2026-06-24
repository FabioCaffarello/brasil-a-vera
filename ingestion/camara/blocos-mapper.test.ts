import { describe, expect, it } from 'vitest'
import { mapBlocoCamara } from './blocos-mapper'
import type { CamaraBlocoDetalhe } from './blocos-schema'

const blocoBase: CamaraBlocoDetalhe = {
  id: '3',
  nome: 'Bloco PT, PCdoB e PV',
  idLegislatura: 57,
  partidos: [{ sigla: 'PT' }, { sigla: 'PCdoB' }, { sigla: 'PV' }],
}

describe('mapBlocoCamara', () => {
  it('mapeia bloco com partidos corretamente', () => {
    const row = mapBlocoCamara(blocoBase)
    expect(row).toEqual({
      sourceId: '3',
      nome: 'Bloco PT, PCdoB e PV',
      casa: 'CAMARA',
      legislatura: 57,
      partidos: ['PT', 'PCDOB', 'PV'],
    })
  })

  it('normaliza siglas para maiúsculo', () => {
    const bloco: CamaraBlocoDetalhe = {
      ...blocoBase,
      partidos: [{ sigla: 'pt' }, { sigla: 'mdb' }],
    }
    const row = mapBlocoCamara(bloco)
    expect(row.partidos).toEqual(['PT', 'MDB'])
  })

  it('partidos ausentes → array vazio (sem erro)', () => {
    const bloco: CamaraBlocoDetalhe = { ...blocoBase, partidos: undefined }
    const row = mapBlocoCamara(bloco)
    expect(row.partidos).toEqual([])
  })

  it('usa LEGISLATURA_ATUAL quando idLegislatura ausente', () => {
    const bloco: CamaraBlocoDetalhe = { ...blocoBase, idLegislatura: undefined }
    const row = mapBlocoCamara(bloco)
    expect(row.legislatura).toBe(57)
  })

  it('id numérico é convertido para string', () => {
    const bloco: CamaraBlocoDetalhe = {
      ...blocoBase,
      id: 3 as unknown as string,
    }
    const row = mapBlocoCamara(bloco)
    expect(row.sourceId).toBe('3')
  })
})
