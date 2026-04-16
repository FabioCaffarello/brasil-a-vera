import type { DomainEventMediator } from '../domain/events/domain-event-mediator'
import type { IUnitOfWork } from '../domain/repository/unit-of-work.interface'

export class ApplicationService {
  constructor(
    private uow: IUnitOfWork,
    private domainEventMediator: DomainEventMediator,
  ) {}

  async run<T>(callback: () => Promise<T>): Promise<T> {
    await this.uow.start()
    try {
      const result = await callback()
      const aggregateRoots = this.uow.getAggregateRoots()
      await this.domainEventMediator.publishAll(aggregateRoots)
      await this.uow.commit()
      return result
    } catch (error) {
      await this.uow.rollback()
      throw error
    }
  }
}
