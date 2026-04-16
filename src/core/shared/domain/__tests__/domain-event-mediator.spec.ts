import { describe, expect, it, vi } from 'vitest'
import { AggregateRoot } from '../aggregate-root'
import type { IDomainEvent } from '../events/domain-event.interface'
import { DomainEventMediator } from '../events/domain-event-mediator'
import { ValueObject } from '../value-object'

class StubId extends ValueObject {
  constructor(readonly id: string) {
    super()
  }
}

class StubAggregate extends AggregateRoot {
  constructor(readonly stubId: StubId) {
    super()
  }

  get entityId(): ValueObject {
    return this.stubId
  }

  toJSON(): Record<string, unknown> {
    return { id: this.stubId.id }
  }
}

class StubEvent implements IDomainEvent {
  aggregateId: ValueObject
  occurredOn: Date
  eventVersion = 1
  trustLevel: 'L1' = 'L1'
  correlationId: string
  payload: unknown

  constructor(aggregateId: ValueObject) {
    this.aggregateId = aggregateId
    this.occurredOn = new Date()
    this.correlationId = 'test-corr'
    this.payload = {}
  }
}

describe('DomainEventMediator', () => {
  it('should register and dispatch handlers', async () => {
    const mediator = new DomainEventMediator()
    const handler = vi.fn()
    mediator.register('StubEvent', handler)

    const agg = new StubAggregate(new StubId('1'))
    const event = new StubEvent(agg.entityId)
    agg.applyEvent(event)

    await mediator.publish(agg)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('should mark events as dispatched after publishing', async () => {
    const mediator = new DomainEventMediator()
    mediator.register('StubEvent', vi.fn())

    const agg = new StubAggregate(new StubId('1'))
    agg.applyEvent(new StubEvent(agg.entityId))

    await mediator.publish(agg)
    expect(agg.getUncommittedEvents()).toHaveLength(0)
  })

  it('should call multiple handlers for the same event type', async () => {
    const mediator = new DomainEventMediator()
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    mediator.register('StubEvent', handler1)
    mediator.register('StubEvent', handler2)

    const agg = new StubAggregate(new StubId('1'))
    agg.applyEvent(new StubEvent(agg.entityId))

    await mediator.publish(agg)

    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
  })

  it('should not fail when no handlers are registered', async () => {
    const mediator = new DomainEventMediator()
    const agg = new StubAggregate(new StubId('1'))
    agg.applyEvent(new StubEvent(agg.entityId))

    await expect(mediator.publish(agg)).resolves.toBeUndefined()
  })

  it('should publishAll for multiple aggregates', async () => {
    const mediator = new DomainEventMediator()
    const handler = vi.fn()
    mediator.register('StubEvent', handler)

    const agg1 = new StubAggregate(new StubId('1'))
    const agg2 = new StubAggregate(new StubId('2'))
    agg1.applyEvent(new StubEvent(agg1.entityId))
    agg2.applyEvent(new StubEvent(agg2.entityId))

    await mediator.publishAll([agg1, agg2])

    expect(handler).toHaveBeenCalledTimes(2)
  })
})
