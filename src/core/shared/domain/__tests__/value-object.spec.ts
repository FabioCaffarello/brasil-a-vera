import { describe, expect, it } from 'vitest'
import { ValueObject } from '../value-object'

class StubValueObject extends ValueObject {
  constructor(readonly value: string) {
    super()
  }
}

class AnotherValueObject extends ValueObject {
  constructor(readonly value: string) {
    super()
  }
}

describe('ValueObject', () => {
  it('should be equal when values are the same', () => {
    const vo1 = new StubValueObject('test')
    const vo2 = new StubValueObject('test')
    expect(vo1.equals(vo2)).toBe(true)
  })

  it('should not be equal when values are different', () => {
    const vo1 = new StubValueObject('test')
    const vo2 = new StubValueObject('other')
    expect(vo1.equals(vo2)).toBe(false)
  })

  it('should not be equal when comparing with null', () => {
    const vo = new StubValueObject('test')
    expect(vo.equals(null as unknown as StubValueObject)).toBe(false)
  })

  it('should not be equal when comparing with undefined', () => {
    const vo = new StubValueObject('test')
    expect(vo.equals(undefined as unknown as StubValueObject)).toBe(false)
  })

  it('should not be equal when types differ', () => {
    const vo1 = new StubValueObject('test')
    const vo2 = new AnotherValueObject('test')
    expect(vo1.equals(vo2 as unknown as StubValueObject)).toBe(false)
  })
})
