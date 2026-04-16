import type { AggregateRoot } from '../aggregate-root'

export interface IUnitOfWork {
  start(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  addAggregateRoot(aggregate: AggregateRoot): void
  getAggregateRoots(): AggregateRoot[]
}
