import { describe, expect, it } from 'vitest'

import { mapMesaItemCamara, normalizarTituloMesa } from './mesa-diretora-mapper'
import type { CamaraMesaItem } from './mesa-diretora-schema'

describe('normalizarTituloMesa', () => {
  it.each([
    ['Presidente', 'PRESIDENTE_MESA'],
    ['1º Vice-Presidente', 'VICE_PRESIDENTE_MESA'],
    ['2º Vice-Presidente', 'VICE_PRESIDENTE_MESA'],
    ['1º Secretário', 'SECRETARIO_MESA'],
    ['2º Secretário', 'SECRETARIO_MESA'],
    ['3º Secretário', 'SECRETARIO_MESA'],
    ['4º Secretário', 'SECRETARIO_MESA'],
    ['1º Suplente de Secretário', 'SUPLENTE_MESA'],
    ['2º Suplente de Secretário', 'SUPLENTE_MESA'],
    ['PRESIDENTE', 'PRESIDENTE_MESA'], // maiúsculas
    [null, 'SUPLENTE_MESA'],
    [undefined, 'SUPLENTE_MESA'],
    ['', 'SUPLENTE_MESA'],
  ] as const)('"%s" → %s', (titulo, expected) => {
    expect(normalizarTituloMesa(titulo)).toBe(expected)
  })
})

describe('mapMesaItemCamara', () => {
  const parlamentarMap = new Map([['73450', 'uuid-presidente']])
  const legislatura = 57

  const base: CamaraMesaItem = {
    id: 73450,
    nome: 'Arthur Lira',
    titulo: 'Presidente',
    siglaPartido: 'PP',
    siglaUf: 'AL',
  }

  it('retorna row com tipo e entidade corretos para Presidente', () => {
    const row = mapMesaItemCamara(base, legislatura, parlamentarMap)
    expect(row).toEqual({
      parlamentarId: 'uuid-presidente',
      tipo: 'PRESIDENTE_MESA',
      entidade: 'Mesa Diretora',
      casa: 'CAMARA',
      legislatura: 57,
      dataInicio: null,
      dataFim: null,
    })
  })

  it('retorna null quando parlamentar não está na base', () => {
    const out = mapMesaItemCamara(
      { ...base, id: 99999 },
      legislatura,
      parlamentarMap,
    )
    expect(out).toBeNull()
  })

  it('Vice-Presidente → VICE_PRESIDENTE_MESA', () => {
    const row = mapMesaItemCamara(
      { ...base, id: 73450, titulo: '1º Vice-Presidente' },
      legislatura,
      parlamentarMap,
    )
    expect(row?.tipo).toBe('VICE_PRESIDENTE_MESA')
    expect(row?.entidade).toBe('Mesa Diretora')
  })

  it('Secretário → SECRETARIO_MESA', () => {
    const row = mapMesaItemCamara(
      { ...base, id: 73450, titulo: '1º Secretário' },
      legislatura,
      parlamentarMap,
    )
    expect(row?.tipo).toBe('SECRETARIO_MESA')
  })

  it('Suplente de Secretário → SUPLENTE_MESA', () => {
    const row = mapMesaItemCamara(
      { ...base, id: 73450, titulo: '1º Suplente de Secretário' },
      legislatura,
      parlamentarMap,
    )
    expect(row?.tipo).toBe('SUPLENTE_MESA')
  })
})
