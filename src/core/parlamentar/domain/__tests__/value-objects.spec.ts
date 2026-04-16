import { describe, expect, it } from 'vitest'
import { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import { Legislatura } from '../value-objects/legislatura.vo'
import { ParlamentarId } from '../value-objects/parlamentar-id.vo'
import { Partido } from '../value-objects/partido.vo'

describe('ParlamentarId', () => {
  it('should generate a valid UUID', () => {
    const id = new ParlamentarId()
    expect(id.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  it('should accept a valid UUID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const id = new ParlamentarId(uuid)
    expect(id.id).toBe(uuid)
  })
})

describe('Partido', () => {
  it('should preserve original casing of sigla (PCdoB ≠ PCDOB)', () => {
    const partido = new Partido('PCdoB', 'Partido Comunista do Brasil')
    expect(partido.sigla).toBe('PCdoB')
    expect(partido.nome).toBe('Partido Comunista do Brasil')
  })

  it('should trim whitespace from sigla', () => {
    const partido = new Partido('  PT  ', 'Partido dos Trabalhadores')
    expect(partido.sigla).toBe('PT')
  })

  it('should return sigla via toString()', () => {
    const partido = new Partido('PSOL', 'Partido Socialismo e Liberdade')
    expect(partido.toString()).toBe('PSOL')
  })

  it('should be equal when sigla and nome match', () => {
    const p1 = new Partido('PT', 'Partido dos Trabalhadores')
    const p2 = new Partido('PT', 'Partido dos Trabalhadores')
    expect(p1.equals(p2)).toBe(true)
  })

  it('should not be equal when sigla differs', () => {
    const p1 = new Partido('PT', 'Partido dos Trabalhadores')
    const p2 = new Partido('PL', 'Partido Liberal')
    expect(p1.equals(p2)).toBe(false)
  })
})

describe('Legislatura', () => {
  it('should create a legislatura', () => {
    const periodo = new DateRange(new Date(2023, 0, 1), new Date(2027, 0, 31))
    const leg = new Legislatura(57, periodo)
    expect(leg.numero).toBe(57)
    expect(leg.periodo).toBe(periodo)
  })

  it('should return string representation', () => {
    const periodo = new DateRange(new Date(2023, 0, 1), new Date(2027, 0, 31))
    const leg = new Legislatura(57, periodo)
    expect(leg.toString()).toBe('57ª Legislatura')
  })

  it('should be equal with same values', () => {
    const periodo = new DateRange(new Date(2023, 0, 1), new Date(2027, 0, 31))
    const l1 = new Legislatura(57, periodo)
    const l2 = new Legislatura(57, periodo)
    expect(l1.equals(l2)).toBe(true)
  })
})
