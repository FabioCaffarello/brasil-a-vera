import { describe, expect, it } from 'vitest'
import { VotoNominal } from '../voto-nominal.entity'

describe('VotoNominal', () => {
  it('should create with all fields', () => {
    const voto = new VotoNominal({
      parlamentarIdExterno: '1001',
      tipoVoto: 'SIM',
      dataHora: new Date('2024-06-15T14:05:00Z'),
    })
    expect(voto.parlamentarIdExterno).toBe('1001')
    expect(voto.tipoVoto).toBe('SIM')
    expect(voto.dataHora).toEqual(new Date('2024-06-15T14:05:00Z'))
    expect(voto.votoNominalId.id).toBeDefined()
  })

  it('should handle null dataHora', () => {
    const voto = new VotoNominal({
      parlamentarIdExterno: '1001',
      tipoVoto: 'AUSENTE',
      dataHora: null,
    })
    expect(voto.dataHora).toBeNull()
  })

  it('should return JSON', () => {
    const voto = new VotoNominal({
      parlamentarIdExterno: '1001',
      tipoVoto: 'NAO',
      dataHora: new Date('2024-06-15T14:05:00Z'),
    })
    const json = voto.toJSON()
    expect(json.parlamentarIdExterno).toBe('1001')
    expect(json.tipoVoto).toBe('NAO')
  })
})
