import { describe, expect, it } from 'vitest'
import { InvalidArgumentError } from '../errors/invalid-argument.error'
import { DateRange } from '../value-objects/date-range.vo'

describe('DateRange', () => {
  const jan1 = new Date(2024, 0, 1)
  const jun1 = new Date(2024, 5, 1)
  const dec31 = new Date(2024, 11, 31)

  it('should create a date range with start and end', () => {
    const range = new DateRange(jan1, dec31)
    expect(range.start).toBe(jan1)
    expect(range.end).toBe(dec31)
  })

  it('should create an open-ended range', () => {
    const range = new DateRange(jan1)
    expect(range.start).toBe(jan1)
    expect(range.end).toBeNull()
  })

  it('should throw if end is before start', () => {
    expect(() => new DateRange(dec31, jan1)).toThrow(InvalidArgumentError)
  })

  describe('isActive', () => {
    it('should be active when reference is within range', () => {
      const range = new DateRange(jan1, dec31)
      expect(range.isActive(jun1)).toBe(true)
    })

    it('should not be active when reference is before start', () => {
      const range = new DateRange(jun1, dec31)
      expect(range.isActive(jan1)).toBe(false)
    })

    it('should not be active when reference is after end', () => {
      const range = new DateRange(jan1, jun1)
      expect(range.isActive(dec31)).toBe(false)
    })

    it('should be active on boundary dates', () => {
      const range = new DateRange(jan1, dec31)
      expect(range.isActive(jan1)).toBe(true)
      expect(range.isActive(dec31)).toBe(true)
    })

    it('should handle open-ended range', () => {
      const range = new DateRange(jan1)
      expect(range.isActive(dec31)).toBe(true)
    })
  })

  describe('overlaps', () => {
    it('should detect overlapping ranges', () => {
      const range1 = new DateRange(jan1, jun1)
      const range2 = new DateRange(new Date(2024, 3, 1), dec31)
      expect(range1.overlaps(range2)).toBe(true)
    })

    it('should detect non-overlapping ranges', () => {
      const range1 = new DateRange(jan1, new Date(2024, 2, 31))
      const range2 = new DateRange(jun1, dec31)
      expect(range1.overlaps(range2)).toBe(false)
    })

    it('should handle open-ended ranges', () => {
      const range1 = new DateRange(jan1)
      const range2 = new DateRange(jun1, dec31)
      expect(range1.overlaps(range2)).toBe(true)
    })
  })

  describe('durationInDays', () => {
    it('should return duration in days', () => {
      const range = new DateRange(jan1, new Date(2024, 0, 11))
      expect(range.durationInDays()).toBe(10)
    })

    it('should return null for open-ended range', () => {
      const range = new DateRange(jan1)
      expect(range.durationInDays()).toBeNull()
    })
  })

  describe('equals', () => {
    it('should be equal with same start and end', () => {
      const range1 = new DateRange(jan1, dec31)
      const range2 = new DateRange(jan1, dec31)
      expect(range1.equals(range2)).toBe(true)
    })

    it('should not be equal with different dates', () => {
      const range1 = new DateRange(jan1, jun1)
      const range2 = new DateRange(jan1, dec31)
      expect(range1.equals(range2)).toBe(false)
    })
  })
})
