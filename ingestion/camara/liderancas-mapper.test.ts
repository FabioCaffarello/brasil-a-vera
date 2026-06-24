import { describe, expect, it } from 'vitest'
import { mapLiderCamara, normalizarTituloCamara } from './liderancas-mapper'
import type { CamaraLider } from './liderancas-schema'

const liderBase: CamaraLider = {
  id: 204521,
  nome: 'Alexandre Padilha',
  titulo: 'Líder',
  idLegislatura: 57,
  siglaPartido: 'PT',
}

const mapaDeputados = new Map([['204521', 'uuid-padilha']])

describe('normalizarTituloCamara', () => {
  it('mapeia "Líder" → LIDER_PARTIDO', () => {
    expect(normalizarTituloCamara('Líder')).toBe('LIDER_PARTIDO')
  })
  it('mapeia "Lider" sem acento → LIDER_PARTIDO', () => {
    expect(normalizarTituloCamara('Lider')).toBe('LIDER_PARTIDO')
  })
  it('mapeia "Vice-Líder" → VICE_LIDER_PARTIDO', () => {
    expect(normalizarTituloCamara('Vice-Líder')).toBe('VICE_LIDER_PARTIDO')
  })
  it('mapeia "1º Vice-Líder" → VICE_LIDER_PARTIDO', () => {
    expect(normalizarTituloCamara('1º Vice-Líder')).toBe('VICE_LIDER_PARTIDO')
  })
  it('null → LIDER_PARTIDO (default seguro)', () => {
    expect(normalizarTituloCamara(null)).toBe('LIDER_PARTIDO')
  })
})

describe('mapLiderCamara', () => {
  it('retorna row quando parlamentarId resolve', () => {
    const row = mapLiderCamara(liderBase, 'PT', 57, mapaDeputados)
    expect(row).toEqual({
      parlamentarId: 'uuid-padilha',
      tipo: 'LIDER_PARTIDO',
      entidade: 'PT',
      casa: 'CAMARA',
      legislatura: 57,
      dataInicio: null,
      dataFim: null,
    })
  })

  it('retorna null quando sourceId não está na base', () => {
    const fora: CamaraLider = { ...liderBase, id: 999999 }
    expect(mapLiderCamara(fora, 'PT', 57, mapaDeputados)).toBeNull()
  })

  it('vice-líder → VICE_LIDER_PARTIDO', () => {
    const vice: CamaraLider = { ...liderBase, titulo: 'Vice-Líder' }
    const row = mapLiderCamara(vice, 'PT', 57, mapaDeputados)
    expect(row?.tipo).toBe('VICE_LIDER_PARTIDO')
  })
})
