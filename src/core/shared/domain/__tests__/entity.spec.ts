import { describe, expect, it } from 'vitest'
import { Entity } from '../entity'
import { Notification } from '../validators/notification'
import { ValueObject } from '../value-object'

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

describe('Entity', () => {
  it('should have a notification instance', () => {
    const entity = new StubEntity(new StubId('1'), 'test')
    expect(entity.notification).toBeInstanceOf(Notification)
    expect(entity.notification.hasErrors()).toBe(false)
  })

  it('should return entityId', () => {
    const id = new StubId('1')
    const entity = new StubEntity(id, 'test')
    expect(entity.entityId).toBe(id)
  })

  it('should return JSON representation', () => {
    const entity = new StubEntity(new StubId('1'), 'test')
    expect(entity.toJSON()).toEqual({ id: '1', name: 'test' })
  })

  it('should allow adding errors to notification', () => {
    const entity = new StubEntity(new StubId('1'), 'test')
    entity.notification.addError('name is required', 'name')
    expect(entity.notification.hasErrors()).toBe(true)
  })
})
