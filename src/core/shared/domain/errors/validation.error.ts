import type { Notification } from '../validators/notification'

export class EntityValidationError extends Error {
  constructor(public readonly errors: Array<{ [key: string]: string[] }>) {
    super('Entity validation failed')
    this.name = 'EntityValidationError'
  }

  static fromNotification(notification: Notification): EntityValidationError {
    return new EntityValidationError(notification.toJSON())
  }
}

export class SearchValidationError extends Error {
  constructor(public readonly errors: Array<{ [key: string]: string[] }>) {
    super('Search validation failed')
    this.name = 'SearchValidationError'
  }

  static fromNotification(notification: Notification): SearchValidationError {
    return new SearchValidationError(notification.toJSON())
  }
}
