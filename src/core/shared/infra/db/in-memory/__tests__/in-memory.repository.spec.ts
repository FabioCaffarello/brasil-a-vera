import { describe, expect, it } from 'vitest'
import { Entity } from '../../../../domain/entity'
import { InvalidArgumentError } from '../../../../domain/errors/invalid-argument.error'
import { NotFoundError } from '../../../../domain/errors/not-found.error'
import { ValueObject } from '../../../../domain/value-object'
import { InMemoryRepository } from '../in-memory.repository'

class StubId extends ValueObject {
  constructor(readonly id: string) {
    super()
  }
}

class StubEntity extends Entity {
  constructor(
    readonly stubId: StubId,
    public name: string,
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

class StubInMemoryRepository extends InMemoryRepository<StubEntity, StubId> {
  getEntity(): new (...args: unknown[]) => StubEntity {
    return StubEntity as new (
      ...args: unknown[]
    ) => StubEntity
  }
}

describe('InMemoryRepository', () => {
  let repo: StubInMemoryRepository

  function createEntity(id: string, name: string): StubEntity {
    return new StubEntity(new StubId(id), name)
  }

  it('should insert an entity', async () => {
    repo = new StubInMemoryRepository()
    const entity = createEntity('1', 'test')
    await repo.insert(entity)
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0]).toBe(entity)
  })

  it('should bulk insert entities', async () => {
    repo = new StubInMemoryRepository()
    const entities = [createEntity('1', 'a'), createEntity('2', 'b')]
    await repo.bulkInsert(entities)
    expect(repo.items).toHaveLength(2)
  })

  it('should find by id', async () => {
    repo = new StubInMemoryRepository()
    const entity = createEntity('1', 'test')
    await repo.insert(entity)
    const found = await repo.findById(new StubId('1'))
    expect(found).toBe(entity)
  })

  it('should return null when not found', async () => {
    repo = new StubInMemoryRepository()
    const found = await repo.findById(new StubId('999'))
    expect(found).toBeNull()
  })

  it('should find all entities', async () => {
    repo = new StubInMemoryRepository()
    await repo.bulkInsert([createEntity('1', 'a'), createEntity('2', 'b')])
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('should update an entity', async () => {
    repo = new StubInMemoryRepository()
    const entity = createEntity('1', 'old')
    await repo.insert(entity)
    const updated = createEntity('1', 'new')
    await repo.update(updated)
    expect(repo.items[0].name).toBe('new')
  })

  it('should throw NotFoundError when updating non-existent entity', async () => {
    repo = new StubInMemoryRepository()
    const entity = createEntity('999', 'test')
    await expect(repo.update(entity)).rejects.toThrow(NotFoundError)
  })

  it('should delete an entity', async () => {
    repo = new StubInMemoryRepository()
    const entity = createEntity('1', 'test')
    await repo.insert(entity)
    await repo.delete(new StubId('1'))
    expect(repo.items).toHaveLength(0)
  })

  it('should throw NotFoundError when deleting non-existent entity', async () => {
    repo = new StubInMemoryRepository()
    await expect(repo.delete(new StubId('999'))).rejects.toThrow(NotFoundError)
  })

  it('should find by multiple ids', async () => {
    repo = new StubInMemoryRepository()
    await repo.bulkInsert([
      createEntity('1', 'a'),
      createEntity('2', 'b'),
      createEntity('3', 'c'),
    ])
    const found = await repo.findByIds([new StubId('1'), new StubId('3')])
    expect(found).toHaveLength(2)
  })

  it('should check existence by ids', async () => {
    repo = new StubInMemoryRepository()
    await repo.bulkInsert([createEntity('1', 'a'), createEntity('2', 'b')])
    const result = await repo.existsById([new StubId('1'), new StubId('3')])
    expect(result.exists).toHaveLength(1)
    expect(result.notExists).toHaveLength(1)
  })

  it('should throw InvalidArgumentError when existsById receives empty array', async () => {
    repo = new StubInMemoryRepository()
    await expect(repo.existsById([])).rejects.toThrow(InvalidArgumentError)
  })
})
