import { describe, expect, it } from 'vitest'
import { SearchParams } from '../repository/search-params'

describe('SearchParams', () => {
  describe('page', () => {
    it('should default to 1', () => {
      const params = new SearchParams()
      expect(params.page).toBe(1)
    })

    it('should accept a valid page', () => {
      const params = new SearchParams({ page: 3 })
      expect(params.page).toBe(3)
    })

    it('should default to 1 for invalid values', () => {
      expect(new SearchParams({ page: 0 }).page).toBe(1)
      expect(new SearchParams({ page: -1 }).page).toBe(1)
      expect(new SearchParams({ page: 1.5 }).page).toBe(1)
      expect(new SearchParams({ page: NaN }).page).toBe(1)
    })
  })

  describe('perPage', () => {
    it('should default to 15', () => {
      const params = new SearchParams()
      expect(params.perPage).toBe(15)
    })

    it('should accept a valid perPage', () => {
      const params = new SearchParams({ perPage: 25 })
      expect(params.perPage).toBe(25)
    })

    it('should default to 15 for invalid values', () => {
      expect(new SearchParams({ perPage: 0 }).perPage).toBe(15)
      expect(new SearchParams({ perPage: -1 }).perPage).toBe(15)
      expect(new SearchParams({ perPage: NaN }).perPage).toBe(15)
    })
  })

  describe('sort', () => {
    it('should default to null', () => {
      const params = new SearchParams()
      expect(params.sort).toBeNull()
    })

    it('should accept a sort field', () => {
      const params = new SearchParams({ sort: 'name' })
      expect(params.sort).toBe('name')
    })
  })

  describe('sortDir', () => {
    it('should be null when sort is null', () => {
      const params = new SearchParams({ sortDir: 'desc' })
      expect(params.sortDir).toBeNull()
    })

    it('should default to asc when sort is provided', () => {
      const params = new SearchParams({ sort: 'name' })
      expect(params.sortDir).toBe('asc')
    })

    it('should accept desc', () => {
      const params = new SearchParams({ sort: 'name', sortDir: 'desc' })
      expect(params.sortDir).toBe('desc')
    })

    it('should normalize to asc for invalid values', () => {
      const params = new SearchParams({
        sort: 'name',
        sortDir: 'INVALID' as 'asc',
      })
      expect(params.sortDir).toBe('asc')
    })
  })

  describe('filter', () => {
    it('should default to null', () => {
      const params = new SearchParams()
      expect(params.filter).toBeNull()
    })

    it('should accept a filter', () => {
      const params = new SearchParams({ filter: 'test' })
      expect(params.filter).toBe('test')
    })
  })
})
