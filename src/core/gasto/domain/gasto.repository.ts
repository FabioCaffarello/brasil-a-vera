import type { ISearchableRepository } from '@/core/shared/domain/repository/repository.interface'
import type { Gasto } from './gasto.aggregate'
import type { GastoId } from './value-objects/gasto-id.vo'

export type GastoFilter = string

export interface IGastoRepository
  extends ISearchableRepository<Gasto, GastoId, GastoFilter> {
  findByCodDocumento(codDocumento: number): Promise<Gasto | null>
  findByParlamentarIdExterno(parlamentarIdExterno: string): Promise<Gasto[]>
}
