import type { ValueObject } from '../value-object'

export type TrustLevel = 'L1' | 'L2' | 'L3' | 'L4'

export interface IDomainEvent<T = unknown> {
  aggregateId: ValueObject
  occurredOn: Date
  eventVersion: number
  trustLevel: TrustLevel
  correlationId: string
  payload: T
}
