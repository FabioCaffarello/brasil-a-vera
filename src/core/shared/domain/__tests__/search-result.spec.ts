import { describe, expect, it } from 'vitest'
import { Entity } from '../entity'
import { SearchResult } from '../repository/search-result'
import { ValueObject } from '../value-object'

class StubId extends ValueObject {
  constructor(readonly id: string) {
    super()
  }
}

class StubEntity extends Entity {
  constructor(
    readonly stubId: StubId,
    readonly name: string,
  ) {
    super()
  }

  get entityId(): ValueObject {
    return this.stubId
  }

  toJSON(): Record<string, unknown> {
    return { id: this.stubId.id, name: this.name }
  }
}

describe('SearchResult', () => {
  it('should create a search result', () => {
    const entity = new StubEntity(new StubId('1'), 'test')
    const result = new SearchResult({
      items: [entity],
      total: 1,
      currentPage: 1,
      perPage: 15,
    })

    expect(result.items).toEqual([entity])
    expect(result.total).toBe(1)
    expect(result.currentPage).toBe(1)
    expect(result.perPage).toBe(15)
    expect(result.lastPage).toBe(1)
  })

  it('should calculate lastPage correctly', () => {
    const result = new SearchResult({
      items: [],
      total: 50,
      currentPage: 1,
      perPage: 15,
    })
    expect(result.lastPage).toBe(4) // ceil(50/15) = 4
  })

  it('should return lastPage as 1 when total equals perPage', () => {
    const result = new SearchResult({
      items: [],
      total: 15,
      currentPage: 1,
      perPage: 15,
    })
    expect(result.lastPage).toBe(1)
  })

  it('should convert to JSON without entity transform', () => {
    const entity = new StubEntity(new StubId('1'), 'test')
    const result = new SearchResult({
      items: [entity],
      total: 1,
      currentPage: 1,
      perPage: 15,
    })
    const json = result.toJSON()
    expect(json.items).toEqual([entity])
    expect(json.total).toBe(1)
    expect(json.lastPage).toBe(1)
  })

  it('should convert to JSON with entity transform', () => {
    const entity = new StubEntity(new StubId('1'), 'test')
    const result = new SearchResult({
      items: [entity],
      total: 1,
      currentPage: 1,
      perPage: 15,
    })
    const json = result.toJSON(true)
    expect(json.items).toEqual([{ id: '1', name: 'test' }])
  })
})
