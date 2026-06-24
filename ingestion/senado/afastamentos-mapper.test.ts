import { describe, expect, it } from 'vitest'
import { mapAfastamentos } from './afastamentos-mapper'
import { licencaParlamentarEnvelopeSchema } from './afastamentos-schema'

// Fixture derivado da resposta real da API (curl 2026-06-24, princípio 13).
// GET /senador/6336/licencas — Camilo Santana, 1 licença.
const fixtureReal = {
  LicencaParlamentar: {
    Parlamentar: {
      Codigo: '6336',
      Nome: 'Camilo Santana',
      Licencas: {
        Licenca: {
          Codigo: '26186',
          DataInicio: '2026-04-08',
          DataFim: '2026-04-08',
          SiglaTipoAfastamento: 'LICENCA_ATIVIDADE_PARLAMENTAR',
          DescricaoTipoAfastamento:
            'Missão política ou cultural de interesse parlamentar',
        },
      },
    },
  },
}

// Fixture com array de licenças (senador com histórico mais longo).
const fixtureMultiplas = {
  LicencaParlamentar: {
    Parlamentar: {
      Codigo: '5012',
      Licencas: {
        Licenca: [
          {
            DataInicio: '2023-03-10',
            DataFim: '2023-04-09',
            SiglaTipoAfastamento: 'LICENCA_SAUDE',
            DescricaoTipoAfastamento: 'Saúde',
          },
          {
            DataInicio: '2024-11-01',
            DataFim: null,
            SiglaTipoAfastamento: 'LICENCA_INTERESSE_PARTICULAR',
            DescricaoTipoAfastamento: 'Interesse particular',
          },
        ],
      },
    },
  },
}

// Fixture sem licenças (Licencas ausente).
const fixtureSemLicencas = {
  LicencaParlamentar: {
    Parlamentar: {
      Codigo: '1234',
    },
  },
}

describe('licencaParlamentarEnvelopeSchema', () => {
  it('parseia fixture real (objeto único → array)', () => {
    const result = licencaParlamentarEnvelopeSchema.parse(fixtureReal)
    const licencas =
      result.LicencaParlamentar.Parlamentar?.Licencas?.Licenca ?? []
    expect(licencas).toHaveLength(1)
    expect(licencas[0].motivoSigla).toBe('LICENCA_ATIVIDADE_PARLAMENTAR')
    expect(licencas[0].dataInicio).toBe('2026-04-08')
    expect(licencas[0].dataFim).toBe('2026-04-08')
  })

  it('parseia array de licenças', () => {
    const result = licencaParlamentarEnvelopeSchema.parse(fixtureMultiplas)
    const licencas =
      result.LicencaParlamentar.Parlamentar?.Licencas?.Licenca ?? []
    expect(licencas).toHaveLength(2)
    expect(licencas[1].dataFim).toBeNull()
  })

  it('trata Licencas ausente como array vazio', () => {
    const result = licencaParlamentarEnvelopeSchema.parse(fixtureSemLicencas)
    const licencas =
      result.LicencaParlamentar.Parlamentar?.Licencas?.Licenca ?? []
    expect(licencas).toHaveLength(0)
  })
})

describe('mapAfastamentos', () => {
  it('produz rows para o fixture real', () => {
    const parsed = licencaParlamentarEnvelopeSchema.parse(fixtureReal)
    const rows = mapAfastamentos(parsed)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      motivoSigla: 'LICENCA_ATIVIDADE_PARLAMENTAR',
      dataInicio: '2026-04-08',
      dataFim: '2026-04-08',
    })
  })

  it('produz rows para múltiplas licenças', () => {
    const parsed = licencaParlamentarEnvelopeSchema.parse(fixtureMultiplas)
    const rows = mapAfastamentos(parsed)
    expect(rows).toHaveLength(2)
    expect(rows[1].dataFim).toBeNull()
  })

  it('retorna [] se Parlamentar ou Licencas ausentes', () => {
    const parsed = licencaParlamentarEnvelopeSchema.parse(fixtureSemLicencas)
    expect(mapAfastamentos(parsed)).toHaveLength(0)
  })
})
