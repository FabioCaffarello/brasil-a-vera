import { describe, expect, it } from 'vitest'
import {
  dedupeLiderancas,
  type LiderancaCargoRow,
  mapLiderCamara,
  normalizarTituloCamara,
} from './liderancas-mapper'
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

// Regressão #727: fonte repete o mesmo cargo com dataInicio distintas
// (redesignações no Senado: líder do UNIÃO em 2026-04-14 E 2026-04-15 no
// mesmo payload) — sem dedupe, o INSERT viola lideranca_cargo_natural_key
// e derruba o batch inteiro.
describe('dedupeLiderancas', () => {
  function row(overrides: Partial<LiderancaCargoRow> = {}): LiderancaCargoRow {
    return {
      parlamentarId: 'uuid-1',
      tipo: 'LIDER_PARTIDO',
      entidade: 'UNIÃO',
      casa: 'SENADO',
      legislatura: 57,
      dataInicio: '2026-04-14',
      dataFim: null,
      ...overrides,
    }
  }

  it('colapsa redesignações da mesma chave natural mantendo a mais recente', () => {
    const unicos = dedupeLiderancas([
      row({ dataInicio: '2026-04-14' }),
      row({ dataInicio: '2026-04-15' }),
    ])
    expect(unicos).toHaveLength(1)
    expect(unicos[0].dataInicio).toBe('2026-04-15')
  })

  it('data concreta vence null; empate mantém a primeira (determinístico)', () => {
    const comNull = dedupeLiderancas([row({ dataInicio: null }), row()])
    expect(comNull).toHaveLength(1)
    expect(comNull[0].dataInicio).toBe('2026-04-14')

    const empate = dedupeLiderancas([
      row({ dataFim: null }),
      row({ dataFim: '2026-05-01' }),
    ])
    expect(empate).toHaveLength(1)
    expect(empate[0].dataFim).toBeNull()
  })

  it('chaves naturais distintas não colapsam', () => {
    const unicos = dedupeLiderancas([
      row(),
      row({ tipo: 'VICE_LIDER_PARTIDO' }),
      row({ parlamentarId: 'uuid-2' }),
      row({ entidade: 'PT' }),
    ])
    expect(unicos).toHaveLength(4)
  })
})
