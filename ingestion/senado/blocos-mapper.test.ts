import { describe, expect, it } from 'vitest'
import { mapBlocoSenado } from './blocos-mapper'
import type { SenadoBlocoDetalhe } from './blocos-schema'

const blocoBase: SenadoBlocoDetalhe = {
  DetalhesBloco: {
    Codigo: '42',
    Nome: 'Bloco Parlamentar da Renovação',
    NomeApelido: 'BPR',
    Partidos: {
      Partido: [
        { SiglaPartido: 'PODE', NomePartido: 'Podemos' },
        { SiglaPartido: 'PSDB', NomePartido: 'PSDB' },
      ],
    },
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

  it('usa Nome quando NomeApelido ausente', () => {
    const bloco: SenadoBlocoDetalhe = {
      DetalhesBloco: { ...blocoBase.DetalhesBloco, NomeApelido: undefined },
    }
    expect(mapBlocoSenado(bloco).nome).toBe('Bloco Parlamentar da Renovação')
  })

  it('Partidos ausentes → array vazio', () => {
    const bloco: SenadoBlocoDetalhe = {
      DetalhesBloco: { ...blocoBase.DetalhesBloco, Partidos: undefined },
    }
    expect(mapBlocoSenado(bloco).partidos).toEqual([])
  })

  it('normaliza siglas para maiúsculo', () => {
    const bloco: SenadoBlocoDetalhe = {
      DetalhesBloco: {
        ...blocoBase.DetalhesBloco,
        Partidos: { Partido: [{ SiglaPartido: 'mdb' }] },
      },
    }
    expect(mapBlocoSenado(bloco).partidos).toEqual(['MDB'])
  })
})
