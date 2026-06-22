import { describe, expect, it } from 'vitest'

import { mapRelatoriasSenado } from './relatorias-mapper'
import { senadoRelatoriasEnvelopeSchema } from './relatorias-schema'

function envelope(relatoria: unknown) {
  return senadoRelatoriasEnvelopeSchema.parse({
    MateriasRelatoriaParlamentar: {
      Parlamentar: { Relatorias: { Relatoria: relatoria } },
    },
  })
}

describe('mapRelatoriasSenado', () => {
  it('extrai matéria + data de designação do relator principal', () => {
    const env = envelope([
      {
        DescricaoTipoRelator: 'Relator',
        DataDesignacao: '2026-06-09',
        Materia: { Codigo: '147432' },
      },
      {
        DescricaoTipoRelator: 'Relator',
        DataDesignacao: '2025-01-10',
        Materia: { Codigo: 603 },
      },
    ])
    expect(mapRelatoriasSenado(env)).toEqual([
      { codigoMateria: '147432', designadoEm: '2026-06-09' },
      { codigoMateria: '603', designadoEm: '2025-01-10' },
    ])
  })

  it('exclui tipos não-principais (ad hoc, parcial, revisor)', () => {
    const env = envelope([
      { DescricaoTipoRelator: 'Relator', Materia: { Codigo: '1' } },
      { DescricaoTipoRelator: 'Relator Ad Hoc', Materia: { Codigo: '2' } },
      { DescricaoTipoRelator: 'Relator Parcial', Materia: { Codigo: '3' } },
    ])
    expect(mapRelatoriasSenado(env)).toEqual([
      { codigoMateria: '1', designadoEm: null },
    ])
  })

  it('mesma matéria em mais de uma comissão: guarda a designação mais recente', () => {
    const env = envelope([
      {
        DescricaoTipoRelator: 'Relator',
        DataDesignacao: '2024-03-01',
        Materia: { Codigo: '9' },
      },
      {
        DescricaoTipoRelator: 'Relator',
        DataDesignacao: '2025-08-20',
        Materia: { Codigo: '9' },
      },
    ])
    expect(mapRelatoriasSenado(env)).toEqual([
      { codigoMateria: '9', designadoEm: '2025-08-20' },
    ])
  })

  it('aceita objeto único (XML→JSON) além de array', () => {
    const env = envelope({
      DescricaoTipoRelator: 'Relator',
      DataDesignacao: '2026-01-01',
      Materia: { Codigo: '42' },
    })
    expect(mapRelatoriasSenado(env)).toEqual([
      { codigoMateria: '42', designadoEm: '2026-01-01' },
    ])
  })

  it('senador sem relatorias → vazio', () => {
    const env = senadoRelatoriasEnvelopeSchema.parse({
      MateriasRelatoriaParlamentar: { Parlamentar: {} },
    })
    expect(mapRelatoriasSenado(env)).toEqual([])
  })
})
