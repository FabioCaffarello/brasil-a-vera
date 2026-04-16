import type { ISearchableRepository } from '@/core/shared/domain/repository/repository.interface'
import type { Parlamentar } from './parlamentar.aggregate'
import type { ParlamentarId } from './value-objects/parlamentar-id.vo'

export type ParlamentarFilter = string

export interface IParlamentarRepository
  extends ISearchableRepository<Parlamentar, ParlamentarId, ParlamentarFilter> {
  findByIdExterno(idExterno: string): Promise<Parlamentar | null>
}
