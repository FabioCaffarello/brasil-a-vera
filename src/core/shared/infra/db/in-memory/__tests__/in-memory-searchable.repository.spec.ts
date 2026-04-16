import { describe, expect, it } from 'vitest'
import { Entity } from '../../../../domain/entity'
import { SearchParams } from '../../../../domain/repository/search-params'
import { ValueObject } from '../../../../domain/value-object'
import { InMemorySearchableRepository } from '../in-memory.repository'

class StubId extends ValueObject {
  constructor(readonly id: string) {
    super()
  }
}

class StubEntity extends Entity {
  constructor(
    readonly stubId: StubId,
    public name: string,
    public position: number,
  ) {
    super()
  }

  get entityId(): ValueObject {
    return this.stubId
  }

  toJSON(): Record<string, unknown> {
    return { id: this.stubId.id, name: this.name, position: this.position }
  }
}

class StubSearchableRepository extends InMemorySearchableRepository<
  StubEntity,
  StubId
> {
  sortableFields = ['name', 'position']

  protected async applyFilter(
    items: StubEntity[],
    filter: string | null,
  ): Promise<StubEntity[]> {
    if (!filter) return items
    return items.filter((item) =>
      item.name.toLowerCase().includes(filter.toLowerCase()),
    )
  }

  getEntity(): new (...args: unknown[]) => StubEntity {
    return StubEntity as new (
      ...args: unknown[]
    ) => StubEntity
  }
}

describe('InMemorySearchableRepository', () => {
  let repo: StubSearchableRepository

  function seed(): StubEntity[] {
    const entities = [
      new StubEntity(new StubId('1'), 'Charlie', 3),
      new StubEntity(new StubId('2'), 'Alice', 1),
      new StubEntity(new StubId('3'), 'Bob', 2),
      new StubEntity(new StubId('4'), 'Alice', 4),
      new StubEntity(new StubId('5'), 'David', 5),
    ]
    return entities
  }

  it('should return all items when no filter, sort, or pagination', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(new SearchParams({ perPage: 10 }))
    expect(result.items).toHaveLength(5)
    expect(result.total).toBe(5)
  })

  it('should filter items', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(
      new SearchParams({ filter: 'alice', perPage: 10 }),
    )
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
  })

  it('should sort by name asc', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(
      new SearchParams({ sort: 'name', sortDir: 'asc', perPage: 10 }),
    )
    expect(result.items[0].name).toBe('Alice')
    expect(result.items[result.items.length - 1].name).toBe('David')
  })

  it('should sort by name desc', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(
      new SearchParams({ sort: 'name', sortDir: 'desc', perPage: 10 }),
    )
    expect(result.items[0].name).toBe('David')
  })

  it('should sort by position', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(
      new SearchParams({ sort: 'position', sortDir: 'asc', perPage: 10 }),
    )
    expect(result.items[0].position).toBe(1)
    expect(result.items[4].position).toBe(5)
  })

  it('should not sort by non-sortable field', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(
      new SearchParams({ sort: 'invalid', perPage: 10 }),
    )
    // Should maintain original order
    expect(result.items[0].name).toBe('Charlie')
  })

  it('should paginate results', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(new SearchParams({ page: 2, perPage: 2 }))
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(5)
    expect(result.currentPage).toBe(2)
    expect(result.lastPage).toBe(3)
  })

  it('should combine filter, sort, and pagination', async () => {
    repo = new StubSearchableRepository()
    repo.items = seed()
    const result = await repo.search(
      new SearchParams({
        filter: 'alice',
        sort: 'position',
        sortDir: 'desc',
        page: 1,
        perPage: 1,
      }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].position).toBe(4)
    expect(result.total).toBe(2)
    expect(result.lastPage).toBe(2)
  })
})
