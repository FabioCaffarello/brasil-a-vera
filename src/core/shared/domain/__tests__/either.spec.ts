import { describe, expect, it } from 'vitest'
import { chainEach, Fail, fail, Ok, of, ok, safe, safeAsync } from '../either'

describe('Either', () => {
  describe('Ok', () => {
    it('should create an Ok with a value', () => {
      const result = ok(42)
      expect(result.ok).toBe(42)
      expect(result.isOk()).toBe(true)
      expect(result.isFail()).toBe(false)
    })

    it('should map over the value', () => {
      const result = ok(2).map((v) => v * 3)
      expect(result).toBeInstanceOf(Ok)
      expect((result as Ok<number>).ok).toBe(6)
    })

    it('should chain to another Either', () => {
      const result = ok(2).chain((v) => (v > 0 ? ok(v * 3) : fail('negative')))
      expect(result).toBeInstanceOf(Ok)
      expect((result as Ok<number>).ok).toBe(6)
    })

    it('should support Symbol.iterator', () => {
      const result = ok(42)
      const gen = result[Symbol.iterator]()
      const yielded = gen.next()
      expect(yielded.done).toBe(false)
      expect(yielded.value).toBe(result)
    })
  })

  describe('Fail', () => {
    it('should create a Fail with an error', () => {
      const result = fail('error')
      expect(result.error).toBe('error')
      expect(result.isOk()).toBe(false)
      expect(result.isFail()).toBe(true)
    })

    it('should not map over the value', () => {
      const result = fail<string>('error').map(() => 42)
      expect(result).toBeInstanceOf(Fail)
      expect((result as Fail<string>).error).toBe('error')
    })

    it('should not chain', () => {
      const result = fail<string>('error').chain(() => ok(42))
      expect(result).toBeInstanceOf(Fail)
      expect((result as Fail<string>).error).toBe('error')
    })
  })

  describe('safe', () => {
    it('should return Ok when function succeeds', () => {
      const result = safe(() => 42)
      expect(result.isOk()).toBe(true)
      expect((result as Ok<number>).ok).toBe(42)
    })

    it('should return Fail when function throws', () => {
      const result = safe(() => {
        throw new Error('boom')
      })
      expect(result.isFail()).toBe(true)
      expect((result as Fail<Error>).error).toBeInstanceOf(Error)
    })
  })

  describe('safeAsync', () => {
    it('should return Ok when async function succeeds', async () => {
      const result = await safeAsync(async () => 42)
      expect(result.isOk()).toBe(true)
      expect((result as Ok<number>).ok).toBe(42)
    })

    it('should return Fail when async function throws', async () => {
      const result = await safeAsync(async () => {
        throw new Error('boom')
      })
      expect(result.isFail()).toBe(true)
    })
  })

  describe('of', () => {
    it('should create an Ok', () => {
      const result = of(42)
      expect(result).toBeInstanceOf(Ok)
      expect(result.ok).toBe(42)
    })
  })

  describe('chainEach', () => {
    it('should return Ok with all mapped items', () => {
      const result = chainEach([1, 2, 3], (item) => ok(item * 2))
      expect(result.isOk()).toBe(true)
      expect((result as Ok<number[]>).ok).toEqual([2, 4, 6])
    })

    it('should return Fail on first failure', () => {
      const result = chainEach([1, 2, 3], (item) =>
        item === 2 ? fail('error at 2') : ok(item),
      )
      expect(result.isFail()).toBe(true)
      expect((result as Fail<string>).error).toBe('error at 2')
    })
  })
})
