import { describe, expect, it } from 'vitest'
import { GastoFakeBuilder } from '../../../../domain/gasto-fake.builder'
import { GastoId } from '../../../../domain/value-objects/gasto-id.vo'
import {
  type GastoRow,
  gastoToDomain,
  gastoToPersistence,
} from '../gasto-mapper'

describe('GastoMapper', () => {
  const fixedId = new GastoId('550e8400-e29b-41d4-a716-446655440000')
  const fixedDate = new Date('2025-01-15T00:00:00.000Z')

  function buildFullGasto() {
    const gasto = GastoFakeBuilder.aGasto()
      .withGastoId(fixedId)
      .withParlamentarIdExterno('12345')
      .withAno(2025)
      .withMes(3)
      .withCodDocumento(100001)
      .withValorDocumento(1500.0)
      .withValorLiquido(1500.0)
      .withNomeFornecedor('Empresa XYZ')
      .withTipoDespesa('COMBUSTÍVEIS')
      .build()

    gasto.createdAt = fixedDate
    gasto.updatedAt = fixedDate
    return gasto
  }

  describe('gastoToPersistence', () => {
    it('should convert a full aggregate to persistence format', () => {
      const gasto = buildFullGasto()
      const data = gastoToPersistence(gasto)

      expect(data.id).toBe(fixedId.id)
      expect(data.parlamentarIdExterno).toBe('12345')
      expect(data.ano).toBe(2025)
      expect(data.mes).toBe(3)
      expect(data.codDocumento).toBe(100001)
      expect(data.valorDocumento).toBe(1500.0)
      expect(data.tipoDespesa).toBe('COMBUSTÍVEIS')
      expect(data.nomeFornecedor).toBe('Empresa XYZ')
      expect(data.trustLevel).toBe('L1')
      expect(data.dataDocumento).toBe('2025-01-15')
    })

    it('should handle null dataDocumento', () => {
      const gasto = GastoFakeBuilder.aGasto().build()
      gasto.dataDocumento = null
      const data = gastoToPersistence(gasto)

      expect(data.dataDocumento).toBeNull()
    })
  })

  describe('gastoToDomain', () => {
    it('should reconstruct aggregate from DB row', () => {
      const row: GastoRow = {
        id: fixedId.id,
        parlamentarIdExterno: '12345',
        ano: 2025,
        mes: 3,
        tipoDespesa: 'COMBUSTÍVEIS',
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
        trustLevel: 'L1',
        sourceUrl: 'https://dadosabertos.camara.leg.br',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const entity = gastoToDomain(row)

      expect(entity.gastoId.id).toBe(fixedId.id)
      expect(entity.parlamentarIdExterno).toBe('12345')
      expect(entity.ano).toBe(2025)
      expect(entity.mes).toBe(3)
      expect(entity.tipoDespesa).toBe('COMBUSTÍVEIS')
      expect(entity.dataDocumento).toEqual(new Date('2025-03-15'))
      expect(entity.trust.trustLevel).toBe('L1')
    })

    it('should handle null dataDocumento', () => {
      const row: GastoRow = {
        id: fixedId.id,
        parlamentarIdExterno: '12345',
        ano: 2025,
        mes: 1,
        tipoDespesa: 'ALIMENTAÇÃO',
        codDocumento: 100002,
        tipoDocumento: 'Recibo',
        dataDocumento: null,
        numDocumento: 'R-001',
        valorDocumento: 200.0,
        urlDocumento: '',
        nomeFornecedor: 'Restaurante ABC',
        cnpjCpfFornecedor: '98765432000199',
        valorLiquido: 200.0,
        valorGlosa: 0,
        trustLevel: 'L1',
        sourceUrl: 'https://dadosabertos.camara.leg.br',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const entity = gastoToDomain(row)
      expect(entity.dataDocumento).toBeNull()
    })
  })

  describe('round-trip', () => {
    it('should produce equivalent entity after toPersistence → toDomain', () => {
      const original = buildFullGasto()
      const persisted = gastoToPersistence(original)
      const reconstructed = gastoToDomain({
        ...persisted,
        createdAt: original.createdAt,
        updatedAt: original.updatedAt,
      } as GastoRow)

      expect(reconstructed.gastoId.id).toBe(original.gastoId.id)
      expect(reconstructed.parlamentarIdExterno).toBe(
        original.parlamentarIdExterno,
      )
      expect(reconstructed.ano).toBe(original.ano)
      expect(reconstructed.mes).toBe(original.mes)
      expect(reconstructed.codDocumento).toBe(original.codDocumento)
      expect(reconstructed.valorDocumento).toBe(original.valorDocumento)
      expect(reconstructed.trust.trustLevel).toBe(original.trust.trustLevel)
    })
  })
})
