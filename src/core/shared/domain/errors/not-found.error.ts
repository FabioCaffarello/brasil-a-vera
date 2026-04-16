import type { Entity } from '../entity'
import type { ValueObject } from '../value-object'

export class NotFoundError extends Error {
  constructor(
    id: ValueObject | string,
    entityClass: new (...args: unknown[]) => Entity,
  ) {
    const idValue = typeof id === 'string' ? id : JSON.stringify(id)
    super(`${entityClass.name} not found using ID ${idValue}`)
    this.name = 'NotFoundError'
  }
}
