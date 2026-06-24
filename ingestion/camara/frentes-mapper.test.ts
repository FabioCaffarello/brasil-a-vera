import { describe, expect, it } from 'vitest'
import { mapFrenteCamara, mapFrenteMembroCamara } from './frentes-mapper'
import type { CamaraFrente, CamaraFrenteMembro } from './frentes-schema'

const frenteBase: CamaraFrente = {
  id: 54450,
  titulo: 'Frente Parlamentar da Agropecuária',
  idLegislatura: 57,
}

const membroBase: CamaraFrenteMembro = {
  id: 204521,
  nome: 'Alexandre Padilha',
  titulo: 'Presidente',
}

const mapa = new Map([['204521', 'uuid-padilha']])

describe('mapFrenteCamara', () => {
  it('mapeia frente corretamente', () => {
    expect(mapFrenteCamara(frenteBase)).toEqual({
      sourceId: '54450',
      nome: 'Frente Parlamentar da Agropecuária',
      legislatura: 57,
    })
  })

  it('fallback para leg. 57 quando idLegislatura ausente', () => {
    const f: CamaraFrente = { ...frenteBase, idLegislatura: undefined }
    expect(mapFrenteCamara(f).legislatura).toBe(57)
  })
})

describe('mapFrenteMembroCamara', () => {
  it('mapeia membro com título', () => {
    const row = mapFrenteMembroCamara(membroBase, '54450', mapa)
    expect(row).toEqual({
      frenteSourceId: '54450',
      parlamentarId: 'uuid-padilha',
      titulo: 'Presidente',
    })
  })

  it('título vazio → null', () => {
    const m: CamaraFrenteMembro = { ...membroBase, titulo: '  ' }
    const row = mapFrenteMembroCamara(m, '54450', mapa)
    expect(row?.titulo).toBeNull()
  })

  it('retorna null quando parlamentar fora da base', () => {
    const m: CamaraFrenteMembro = { ...membroBase, id: 999999 }
    expect(mapFrenteMembroCamara(m, '54450', mapa)).toBeNull()
  })
})
