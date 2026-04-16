import { describe, expect, it } from 'vitest'
import { InvalidArgumentError } from '../errors/invalid-argument.error'
import { Uuid } from '../value-objects/uuid.vo'

describe('Uuid', () => {
  it('should generate a valid UUID when no value is provided', () => {
    const uuid = new Uuid()
    expect(uuid.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  it('should accept a valid UUID string', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const uuid = new Uuid(id)
    expect(uuid.id).toBe(id)
  })

  it('should throw InvalidArgumentError for invalid UUID', () => {
    expect(() => new Uuid('not-a-uuid')).toThrow(InvalidArgumentError)
  })

  it('should return id via toString()', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const uuid = new Uuid(id)
    expect(uuid.toString()).toBe(id)
  })

  it('should be equal when IDs match', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const uuid1 = new Uuid(id)
    const uuid2 = new Uuid(id)
    expect(uuid1.equals(uuid2)).toBe(true)
  })

  it('should not be equal when IDs differ', () => {
    const uuid1 = new Uuid()
    const uuid2 = new Uuid()
    expect(uuid1.equals(uuid2)).toBe(false)
  })
})
