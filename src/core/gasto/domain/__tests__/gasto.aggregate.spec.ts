import { describe, expect, it } from 'vitest'
import { Gasto } from '../gasto.aggregate'
import { GastoFakeBuilder } from '../gasto-fake.builder'

describe('Gasto Aggregate', () => {
  it('should create a valid Gasto from command', () => {
    const gasto = Gasto.create({
      parlamentarIdExterno: '12345',
      ano: 2025,
      mes: 3,
      tipoDespesa: 'MANUTENÇÃO DE ESCRITÓRIO',
      codDocumento: 100001,
      tipoDocumento: 'Nota Fiscal',
      dataDocumento: '2025-03-15',
      numDocumento: 'NF-001',
      valorDocumento: 1500.0,
      urlDocumento: 'https://example.com/doc.pdf',
      nomeFornecedor: 'Empresa XYZ',
      cnpjCpfFornecedor: '12345678000190',
      valorLiquido: 1500.0,
      valorGlosa: 0,
      sourceUrl: 'https://dadosabertos.camara.leg.br',
    })

    expect(gasto.parlamentarIdExterno).toBe('12345')
    expect(gasto.ano).toBe(2025)
    expect(gasto.mes).toBe(3)
    expect(gasto.valorDocumento).toBe(1500.0)
    expect(gasto.dataDocumento).toEqual(new Date('2025-03-15'))
    expect(gasto.notification.hasErrors()).toBe(false)
  })

  it('should handle null dataDocumento', () => {
    const gasto = Gasto.create({
      parlamentarIdExterno: '12345',
      ano: 2025,
      mes: 3,
      tipoDespesa: 'COMBUSTÍVEIS',
      codDocumento: 100002,
      tipoDocumento: 'Recibo',
      dataDocumento: null,
      numDocumento: 'R-001',
      valorDocumento: 200.0,
      urlDocumento: '',
      nomeFornecedor: 'Posto ABC',
      cnpjCpfFornecedor: '98765432000199',
      valorLiquido: 200.0,
      valorGlosa: 0,
      sourceUrl: 'https://dadosabertos.camara.leg.br',
    })

    expect(gasto.dataDocumento).toBeNull()
  })

  it('should fail validation with invalid data', () => {
    const gasto = GastoFakeBuilder.aGasto()
      .withParlamentarIdExterno('')
      .withMes(13)
      .build()
    gasto.validate()
    expect(gasto.notification.hasErrors()).toBe(true)
  })

  it('should serialize to JSON', () => {
    const gasto = GastoFakeBuilder.aGasto().build()
    const json = gasto.toJSON()

    expect(json.gastoId).toBeDefined()
    expect(json.parlamentarIdExterno).toBe('12345')
    expect(json.ano).toBe(2025)
    expect(json.trustLevel).toBe('L1')
  })

  it('should create many via FakeBuilder', () => {
    const gastos = GastoFakeBuilder.many(5)
    expect(gastos).toHaveLength(5)
    const codDocumentos = gastos.map((g) => g.codDocumento)
    expect(new Set(codDocumentos).size).toBe(5)
  })
})
