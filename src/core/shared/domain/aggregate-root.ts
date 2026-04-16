import { Entity } from './entity'
import type { IDomainEvent } from './events/domain-event.interface'

export abstract class AggregateRoot extends Entity {
  private events: Set<IDomainEvent> = new Set()
  private dispatchedEvents: Set<IDomainEvent> = new Set()

  applyEvent(event: IDomainEvent): void {
    this.events.add(event)
  }

  markEventAsDispatched(event: IDomainEvent): void {
    this.dispatchedEvents.add(event)
  }

  getUncommittedEvents(): IDomainEvent[] {
    return Array.from(this.events).filter(
      (event) => !this.dispatchedEvents.has(event),
    )
  }

  clearEvents(): void {
    this.events.clear()
    this.dispatchedEvents.clear()
  }
}
