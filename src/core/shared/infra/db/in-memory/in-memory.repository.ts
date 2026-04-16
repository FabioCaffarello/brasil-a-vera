import type { Entity } from '../../../domain/entity'
import { InvalidArgumentError } from '../../../domain/errors/invalid-argument.error'
import { NotFoundError } from '../../../domain/errors/not-found.error'
import type {
  IRepository,
  ISearchableRepository,
} from '../../../domain/repository/repository.interface'
import type { SearchParams } from '../../../domain/repository/search-params'
import { SearchResult } from '../../../domain/repository/search-result'
import type { ValueObject } from '../../../domain/value-object'

export abstract class InMemoryRepository<
  E extends Entity,
  EntityId extends ValueObject,
> implements IRepository<E, EntityId>
{
  items: E[] = []

  async insert(entity: E): Promise<void> {
    this.items.push(entity)
  }

  async bulkInsert(entities: E[]): Promise<void> {
    this.items.push(...entities)
  }

  async update(entity: E): Promise<void> {
    const index = this.items.findIndex((item) =>
      item.entityId.equals(entity.entityId as typeof item.entityId),
    )
    if (index === -1) {
      throw new NotFoundError(entity.entityId, this.getEntity())
    }
    this.items[index] = entity
  }

  async delete(entityId: EntityId): Promise<void> {
    const index = this.items.findIndex((item) =>
      item.entityId.equals(entityId as typeof item.entityId),
    )
    if (index === -1) {
      throw new NotFoundError(entityId, this.getEntity())
    }
    this.items.splice(index, 1)
  }

  async findById(entityId: EntityId): Promise<E | null> {
    const item = this.items.find((item) =>
      item.entityId.equals(entityId as typeof item.entityId),
    )
    return item ?? null
  }

  async findAll(): Promise<E[]> {
    return [...this.items]
  }

  async findByIds(ids: EntityId[]): Promise<E[]> {
    return this.items.filter((item) =>
      ids.some((id) => item.entityId.equals(id as typeof item.entityId)),
    )
  }

  async existsById(
    ids: EntityId[],
  ): Promise<{ exists: EntityId[]; notExists: EntityId[] }> {
    if (!ids.length) {
      throw new InvalidArgumentError('ids must be a non-empty array')
    }
    const exists: EntityId[] = []
    const notExists: EntityId[] = []
    for (const id of ids) {
      const item = this.items.find((item) =>
        item.entityId.equals(id as typeof item.entityId),
      )
      if (item) {
        exists.push(id)
      } else {
        notExists.push(id)
      }
    }
    return { exists, notExists }
  }

  abstract getEntity(): new (...args: unknown[]) => E
}

export abstract class InMemorySearchableRepository<
    E extends Entity,
    EntityId extends ValueObject,
    Filter = string,
  >
  extends InMemoryRepository<E, EntityId>
  implements ISearchableRepository<E, EntityId, Filter>
{
  sortableFields: string[] = []

  async search(props: SearchParams<Filter>): Promise<SearchResult<E>> {
    const filteredItems = await this.applyFilter(this.items, props.filter)
    const sortedItems = this.applySort(filteredItems, props.sort, props.sortDir)
    const paginatedItems = this.applyPaginate(
      sortedItems,
      props.page,
      props.perPage,
    )

    return new SearchResult({
      items: paginatedItems,
      total: filteredItems.length,
      currentPage: props.page,
      perPage: props.perPage,
    })
  }

  protected abstract applyFilter(
    items: E[],
    filter: Filter | null,
  ): Promise<E[]>

  protected applySort(
    items: E[],
    sort: string | null,
    sortDir: string | null,
  ): E[] {
    if (!sort || !this.sortableFields.includes(sort)) {
      return items
    }

    return [...items].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sort]
      const bValue = (b as Record<string, unknown>)[sort]

      if (aValue === bValue) return 0
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDir === 'desc'
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue)
      }

      if (aValue < bValue) return sortDir === 'desc' ? 1 : -1
      return sortDir === 'desc' ? -1 : 1
    })
  }

  protected applyPaginate(items: E[], page: number, perPage: number): E[] {
    const start = (page - 1) * perPage
    const end = start + perPage
    return items.slice(start, end)
  }
}
