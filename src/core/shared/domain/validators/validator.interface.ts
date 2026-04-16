import type { Notification } from './notification'

export type FieldsErrors = Array<{ [key: string]: string[] }>

export interface IValidatorFields {
  validate(notification: Notification, data: unknown, fields: string[]): boolean
}
