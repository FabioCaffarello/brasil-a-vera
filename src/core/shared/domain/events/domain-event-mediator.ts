import type { AggregateRoot } from '../aggregate-root'
import type { IDomainEvent } from './domain-event.interface'

export type DomainEventHandler = (event: IDomainEvent) => Promise<void>

export class DomainEventMediator {
  private handlers = new Map<string, DomainEventHandler[]>()

  register(eventType: string, handler: DomainEventHandler): void {
    const existing = this.handlers.get(eventType) ?? []
    existing.push(handler)
    this.handlers.set(eventType, existing)
  }

  async publish(aggregateRoot: AggregateRoot): Promise<void> {
    const events = aggregateRoot.getUncommittedEvents()
    for (const event of events) {
      await this.publishEvent(event)
      aggregateRoot.markEventAsDispatched(event)
    }
  }

  async publishAll(aggregateRoots: AggregateRoot[]): Promise<void> {
    for (const aggregate of aggregateRoots) {
      await this.publish(aggregate)
    }
  }

  private async publishEvent(event: IDomainEvent): Promise<void> {
    const eventType = event.constructor.name
    const handlers = this.handlers.get(eventType) ?? []
    for (const handler of handlers) {
      await handler(event)
    }
  }
}
