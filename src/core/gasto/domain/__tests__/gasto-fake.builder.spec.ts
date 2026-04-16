import { describe, expect, it } from 'vitest'
import { GastoFakeBuilder } from '../gasto-fake.builder'
import { GastoId } from '../value-objects/gasto-id.vo'

describe('GastoFakeBuilder', () => {
  it('should build a gasto with default values', () => {
    const gasto = GastoFakeBuilder.aGasto().build()

    expect(gasto.parlamentarIdExterno).toBe('12345')
    expect(gasto.ano).toBe(2025)
    expect(gasto.mes).toBe(1)
    expect(gasto.valorDocumento).toBe(1500.0)
    expect(gasto.trust.trustLevel).toBe('L1')
    expect(gasto.notification.hasErrors()).toBe(false)
  })

  it('should allow overriding fields with fluent setters', () => {
    const id = new GastoId()
    const gasto = GastoFakeBuilder.aGasto()
      .withGastoId(id)
      .withParlamentarIdExterno('99999')
      .withAno(2024)
      .withMes(12)
      .withCodDocumento(555)
      .withValorDocumento(999.99)
      .withValorLiquido(900.0)
      .withNomeFornecedor('Fornecedor ABC')
      .withTipoDespesa('PASSAGENS AÉREAS')
      .build()

    expect(gasto.gastoId).toBe(id)
    expect(gasto.parlamentarIdExterno).toBe('99999')
    expect(gasto.ano).toBe(2024)
    expect(gasto.mes).toBe(12)
    expect(gasto.codDocumento).toBe(555)
    expect(gasto.valorDocumento).toBe(999.99)
    expect(gasto.valorLiquido).toBe(900.0)
    expect(gasto.nomeFornecedor).toBe('Fornecedor ABC')
    expect(gasto.tipoDespesa).toBe('PASSAGENS AÉREAS')
  })

  it('should build many gastos with different codDocumentos', () => {
    const gastos = GastoFakeBuilder.many(5)

    expect(gastos).toHaveLength(5)

    const codDocumentos = gastos.map((g) => g.codDocumento)
    expect(new Set(codDocumentos).size).toBe(5)

    const months = gastos.map((g) => g.mes)
    expect(months).toEqual([1, 2, 3, 4, 5])
  })

  it('should build many gastos cycling through parlamentar ids', () => {
    const gastos = GastoFakeBuilder.many(10)
    const ids = gastos.map((g) => g.parlamentarIdExterno)

    expect(ids[0]).toBe('10000')
    expect(ids[5]).toBe('10000')
    expect(ids[1]).toBe('10001')
  })
})
