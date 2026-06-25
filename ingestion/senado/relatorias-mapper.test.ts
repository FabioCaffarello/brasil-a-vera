import { describe, expect, it } from 'vitest'

import { mapRelatoriasSenado } from './relatorias-mapper'
import { relatoriaProcResponseSchema } from './relatorias-schema'

// Fixture real: senador 5936 (Carlos Portinho) — 2 itens representativos
// Probe 2026-06-24: GET /processo/relatoria?codigoParlamentar=5936
const FIXTURE_REAL = [
  {
    codigoMateria: 144149,
    descricaoTipoRelator: 'Relator',
    dataDesignacao: '2020-11-24 06:29:13',
    dataDestituicao: '2020-12-16 15:51:37',
    siglaColegiado: 'CDH',
    tramitando: 'N',
  },
  {
    codigoMateria: 136876,
    descricaoTipoRelator: 'Relator',
    dataDesignacao: '2023-03-21 17:08:42',
    dataDestituicao: null,
    siglaColegiado: 'CE',
    tramitando: 'S',
  },
]

describe('relatoriaProcResponseSchema', () => {
  it('valida array de itens real', () => {
    const result = relatoriaProcResponseSchema.safeParse(FIXTURE_REAL)
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('converte codigoMateria número → string', () => {
    const result = relatoriaProcResponseSchema.parse(FIXTURE_REAL)
    expect(result[0].codigoMateria).toBe('144149')
    expect(typeof result[0].codigoMateria).toBe('string')
  })

  it('valida array vazio (senador sem relatorias)', () => {
    const result = relatoriaProcResponseSchema.safeParse([])
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(0)
  })

  it('aceita campos extras (passthrough)', () => {
    const result = relatoriaProcResponseSchema.safeParse([
      { codigoMateria: 1, descricaoTipoRelator: 'Relator', campoFuturo: 'x' },
    ])
    expect(result.success).toBe(true)
  })
})

describe('mapRelatoriasSenado', () => {
  it('extrai matéria + data de designação (só data, sem hora)', () => {
    const parsed = relatoriaProcResponseSchema.parse(FIXTURE_REAL)
    const result = mapRelatoriasSenado(parsed)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({
      codigoMateria: '144149',
      designadoEm: '2020-11-24',
    })
    expect(result).toContainEqual({
      codigoMateria: '136876',
      designadoEm: '2023-03-21',
    })
  })

  it('exclui tipos não-principais (ad hoc, revisor)', () => {
    const items = relatoriaProcResponseSchema.parse([
      { codigoMateria: '1', descricaoTipoRelator: 'Relator' },
      { codigoMateria: '2', descricaoTipoRelator: 'Relator Ad hoc' },
      { codigoMateria: '3', descricaoTipoRelator: 'Relator Revisor' },
    ])
    const result = mapRelatoriasSenado(items)
    expect(result).toHaveLength(1)
    expect(result[0].codigoMateria).toBe('1')
  })

  it('mesma matéria em mais de uma comissão: guarda designação mais recente', () => {
    const items = relatoriaProcResponseSchema.parse([
      {
        codigoMateria: '9',
        descricaoTipoRelator: 'Relator',
        dataDesignacao: '2024-03-01 10:00:00',
      },
      {
        codigoMateria: '9',
        descricaoTipoRelator: 'Relator',
        dataDesignacao: '2025-08-20 09:00:00',
      },
    ])
    const result = mapRelatoriasSenado(items)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ codigoMateria: '9', designadoEm: '2025-08-20' })
  })

  it('dataDesignacao null → designadoEm null', () => {
    const items = relatoriaProcResponseSchema.parse([
      {
        codigoMateria: '42',
        descricaoTipoRelator: 'Relator',
        dataDesignacao: null,
      },
    ])
    const result = mapRelatoriasSenado(items)
    expect(result[0].designadoEm).toBeNull()
  })

  it('dataDesignacao ausente → designadoEm null', () => {
    const items = relatoriaProcResponseSchema.parse([
      { codigoMateria: '99', descricaoTipoRelator: 'Relator' },
    ])
    const result = mapRelatoriasSenado(items)
    expect(result[0].designadoEm).toBeNull()
  })

  it('inclui relatorias encerradas (dataDestituicao não-null) no dedup', () => {
    const items = relatoriaProcResponseSchema.parse([
      {
        codigoMateria: '10',
        descricaoTipoRelator: 'Relator',
        dataDesignacao: '2020-01-01 00:00:00',
        dataDestituicao: '2020-06-01 00:00:00',
      },
      {
        codigoMateria: '10',
        descricaoTipoRelator: 'Relator',
        dataDesignacao: '2022-03-15 00:00:00',
        dataDestituicao: null,
      },
    ])
    const result = mapRelatoriasSenado(items)
    expect(result).toHaveLength(1)
    // Guarda a mais recente independente do status de destituição
    expect(result[0].designadoEm).toBe('2022-03-15')
  })

  it('array vazio → vazio', () => {
    const result = mapRelatoriasSenado([])
    expect(result).toHaveLength(0)
  })
})
