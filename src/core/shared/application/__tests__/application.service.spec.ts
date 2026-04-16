import { describe, expect, it, vi } from 'vitest'
import { AggregateRoot } from '../../domain/aggregate-root'
import type { IDomainEvent } from '../../domain/events/domain-event.interface'
import { DomainEventMediator } from '../../domain/events/domain-event-mediator'
import type { IUnitOfWork } from '../../domain/repository/unit-of-work.interface'
import { ValueObject } from '../../domain/value-object'
import { ApplicationService } from '../application.service'

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
  occurredOn = new Date()
  eventVersion = 1
  trustLevel: 'L1' = 'L1'
  correlationId = 'test'
  payload = {}

  constructor(aggregateId: ValueObject) {
    this.aggregateId = aggregateId
  }
}

function createMockUoW(aggregates: AggregateRoot[] = []): IUnitOfWork {
  return {
    start: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    addAggregateRoot: vi.fn(),
    getAggregateRoots: () => aggregates,
  }
}

describe('ApplicationService', () => {
  it('should execute callback and commit', async () => {
    const uow = createMockUoW()
    const mediator = new DomainEventMediator()
    const appService = new ApplicationService(uow, mediator)

    const result = await appService.run(async () => 'done')

    expect(result).toBe('done')
    expect(uow.start).toHaveBeenCalledOnce()
    expect(uow.commit).toHaveBeenCalledOnce()
    expect(uow.rollback).not.toHaveBeenCalled()
  })

  it('should rollback on error', async () => {
    const uow = createMockUoW()
    const mediator = new DomainEventMediator()
    const appService = new ApplicationService(uow, mediator)

    await expect(
      appService.run(async () => {
        throw new Error('fail')
      }),
    ).rejects.toThrow('fail')

    expect(uow.start).toHaveBeenCalledOnce()
    expect(uow.rollback).toHaveBeenCalledOnce()
    expect(uow.commit).not.toHaveBeenCalled()
  })

  it('should publish domain events before commit', async () => {
    const agg = new StubAggregate(new StubId('1'))
    agg.applyEvent(new StubEvent(agg.entityId))

    const uow = createMockUoW([agg])
    const mediator = new DomainEventMediator()
    const handler = vi.fn()
    mediator.register('StubEvent', handler)

    const appService = new ApplicationService(uow, mediator)
    await appService.run(async () => 'ok')

    expect(handler).toHaveBeenCalledOnce()
    expect(uow.commit).toHaveBeenCalledOnce()
  })
})
