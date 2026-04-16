import type { Entity } from '../entity'
import type { ValueObject } from '../value-object'
import type { SearchParams } from './search-params'
import type { SearchResult } from './search-result'

export interface IRepository<E extends Entity, EntityId extends ValueObject> {
  insert(entity: E): Promise<void>
  bulkInsert(entities: E[]): Promise<void>
  update(entity: E): Promise<void>
  delete(entityId: EntityId): Promise<void>
  findById(entityId: EntityId): Promise<E | null>
  findAll(): Promise<E[]>
  findByIds(ids: EntityId[]): Promise<E[]>
  existsById(
    ids: EntityId[],
  ): Promise<{ exists: EntityId[]; notExists: EntityId[] }>
  getEntity(): new (...args: unknown[]) => E
}

export interface ISearchableRepository<
  E extends Entity,
  EntityId extends ValueObject,
  Filter = string,
  SearchInput = SearchParams<Filter>,
  SearchOutput = SearchResult<E>,
> extends IRepository<E, EntityId> {
  sortableFields: string[]
  search(props: SearchInput): Promise<SearchOutput>
}
