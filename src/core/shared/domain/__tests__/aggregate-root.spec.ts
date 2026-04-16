import { describe, expect, it } from 'vitest'
import { AggregateRoot } from '../aggregate-root'
import type { IDomainEvent } from '../events/domain-event.interface'
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

function createStubEvent(id: string): IDomainEvent {
  return {
    aggregateId: new StubId(id),
    occurredOn: new Date(),
    eventVersion: 1,
    trustLevel: 'L1',
    correlationId: 'corr-1',
    payload: {},
  }
}

describe('AggregateRoot', () => {
  it('should start with no events', () => {
    const agg = new StubAggregate(new StubId('1'))
    expect(agg.getUncommittedEvents()).toHaveLength(0)
  })

  it('should apply an event', () => {
    const agg = new StubAggregate(new StubId('1'))
    const event = createStubEvent('1')
    agg.applyEvent(event)
    expect(agg.getUncommittedEvents()).toHaveLength(1)
    expect(agg.getUncommittedEvents()[0]).toBe(event)
  })

  it('should not duplicate the same event reference', () => {
    const agg = new StubAggregate(new StubId('1'))
    const event = createStubEvent('1')
    agg.applyEvent(event)
    agg.applyEvent(event)
    expect(agg.getUncommittedEvents()).toHaveLength(1)
  })

  it('should mark event as dispatched', () => {
    const agg = new StubAggregate(new StubId('1'))
    const event = createStubEvent('1')
    agg.applyEvent(event)
    agg.markEventAsDispatched(event)
    expect(agg.getUncommittedEvents()).toHaveLength(0)
  })

  it('should return only uncommitted events', () => {
    const agg = new StubAggregate(new StubId('1'))
    const event1 = createStubEvent('1')
    const event2 = createStubEvent('1')
    agg.applyEvent(event1)
    agg.applyEvent(event2)
    agg.markEventAsDispatched(event1)
    expect(agg.getUncommittedEvents()).toEqual([event2])
  })

  it('should clear all events', () => {
    const agg = new StubAggregate(new StubId('1'))
    agg.applyEvent(createStubEvent('1'))
    agg.applyEvent(createStubEvent('1'))
    agg.clearEvents()
    expect(agg.getUncommittedEvents()).toHaveLength(0)
  })
})
