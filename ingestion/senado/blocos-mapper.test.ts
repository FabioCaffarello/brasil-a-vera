import { describe, expect, it } from 'vitest'
import { mapBlocoSenado } from './blocos-mapper'
import type { SenadoBlocoItem } from './blocos-schema'

const blocoBase: SenadoBlocoItem = {
  CodigoBloco: '42',
  NomeBloco: 'Bloco Parlamentar da Renovação',
  NomeApelido: 'BPR',
  DataCriacao: '2023-01-01',
  Membros: {
    Membro: [
      {
        Partido: { SiglaPartido: 'PODE', NomePartido: 'Podemos' },
        DataAdesao: '2023-01-01',
      },
      {
        Partido: { SiglaPartido: 'PSDB', NomePartido: 'PSDB' },
        DataAdesao: '2023-01-01',
      },
    ],
  },
}

describe('mapBlocoSenado', () => {
  it('mapeia bloco com partidos corretamente', () => {
    const row = mapBlocoSenado(blocoBase)
    expect(row).toEqual({
      sourceId: '42',
      nome: 'BPR',
      casa: 'SENADO',
      legislatura: 57,
      partidos: ['PODE', 'PSDB'],
    })
  })

  it('usa NomeBloco quando NomeApelido ausente', () => {
    const bloco: SenadoBlocoItem = { ...blocoBase, NomeApelido: undefined }
    expect(mapBlocoSenado(bloco).nome).toBe('Bloco Parlamentar da Renovação')
  })

  it('Membros ausentes → array vazio', () => {
    const bloco: SenadoBlocoItem = { ...blocoBase, Membros: undefined }
    expect(mapBlocoSenado(bloco).partidos).toEqual([])
  })

  it('normaliza siglas para maiúsculo', () => {
    const bloco: SenadoBlocoItem = {
      ...blocoBase,
      Membros: {
        Membro: [{ Partido: { SiglaPartido: 'mdb' }, DataAdesao: null }],
      },
    }
    expect(mapBlocoSenado(bloco).partidos).toEqual(['MDB'])
  })
})
