import { describe, expect, it } from 'vitest'
import { mapAfastamentos } from './afastamentos-mapper'
import { senadorLicencasEnvelopeSchema } from './afastamentos-schema'

// Fixture representativo do formato do Senado XML→JSON.
// Array de licencas (>1 licença no histórico do senador).
const fixtureMultiplas = {
  SenadorLicencas: {
    Licencas: {
      Licenca: [
        {
          SiglaMotivoLicenca: 'SS',
          DescricaoMotivoLicenca: 'Saúde',
          DataInicio: '2023-03-10',
          DataFim: '2023-04-09',
        },
        {
          SiglaMotivoLicenca: 'LMM',
          DescricaoMotivoLicenca:
            'Licença para tratar de interesses particulares',
          DataInicio: '2024-11-01',
          DataFim: null,
        },
      ],
    },
  },
}

// Fixture com licença única (objeto, não array — quirk Senado XML→JSON).
const fixtureSingular = {
  SenadorLicencas: {
    Licencas: {
      Licenca: {
        SiglaMotivoLicenca: 'CE',
        DescricaoMotivoLicenca: 'Cargo no Executivo',
        DataInicio: '10/02/2025',
        DataFim: '',
      },
    },
  },
}

// Fixture sem licenças (Licencas ausente).
const fixtureSemLicencas = {
  SenadorLicencas: {},
}

describe('senadorLicencasEnvelopeSchema', () => {
  it('parseia array de licenças com datas ISO', () => {
    const result = senadorLicencasEnvelopeSchema.parse(fixtureMultiplas)
    const licencas = result.SenadorLicencas.Licencas?.Licenca ?? []
    expect(licencas).toHaveLength(2)
    expect(licencas[0].dataInicio).toBe('2023-03-10')
    expect(licencas[0].dataFim).toBe('2023-04-09')
    expect(licencas[1].dataFim).toBeNull()
  })

  it('normaliza objeto único para array', () => {
    const result = senadorLicencasEnvelopeSchema.parse(fixtureSingular)
    const licencas = result.SenadorLicencas.Licencas?.Licenca ?? []
    expect(licencas).toHaveLength(1)
  })

  it('converte data DD/MM/YYYY para YYYY-MM-DD', () => {
    const result = senadorLicencasEnvelopeSchema.parse(fixtureSingular)
    const licencas = result.SenadorLicencas.Licencas?.Licenca ?? []
    expect(licencas[0].dataInicio).toBe('2025-02-10')
  })

  it('trata DataFim vazia como null', () => {
    const result = senadorLicencasEnvelopeSchema.parse(fixtureSingular)
    const licencas = result.SenadorLicencas.Licencas?.Licenca ?? []
    expect(licencas[0].dataFim).toBeNull()
  })

  it('trata Licencas ausente como array vazio', () => {
    const result = senadorLicencasEnvelopeSchema.parse(fixtureSemLicencas)
    const licencas = result.SenadorLicencas.Licencas?.Licenca ?? []
    expect(licencas).toHaveLength(0)
  })
})

describe('mapAfastamentos', () => {
  it('produz rows para todas as licenças com data_inicio válida', () => {
    const parsed = senadorLicencasEnvelopeSchema.parse(fixtureMultiplas)
    const rows = mapAfastamentos(parsed)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      motivoSigla: 'SS',
      dataInicio: '2023-03-10',
      dataFim: '2023-04-09',
    })
    expect(rows[1]).toMatchObject({
      motivoSigla: 'LMM',
      dataFim: null,
    })
  })

  it('retorna [] se Licencas ausente', () => {
    const parsed = senadorLicencasEnvelopeSchema.parse(fixtureSemLicencas)
    expect(mapAfastamentos(parsed)).toHaveLength(0)
  })
})
