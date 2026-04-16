import { InMemorySearchableRepository } from '@/core/shared/infra/db/in-memory/in-memory.repository'
import { Gasto } from '../../../domain/gasto.aggregate'
import type { IGastoRepository } from '../../../domain/gasto.repository'
import type { GastoId } from '../../../domain/value-objects/gasto-id.vo'

export class GastoInMemoryRepository
  extends InMemorySearchableRepository<Gasto, GastoId>
  implements IGastoRepository
{
  sortableFields = ['ano', 'mes', 'valorDocumento', 'createdAt']

  async findByCodDocumento(codDocumento: number): Promise<Gasto | null> {
    return this.items.find((item) => item.codDocumento === codDocumento) ?? null
  }

  async findByParlamentarIdExterno(
    parlamentarIdExterno: string,
  ): Promise<Gasto[]> {
    return this.items.filter(
      (item) => item.parlamentarIdExterno === parlamentarIdExterno,
    )
  }

  protected async applyFilter(
    items: Gasto[],
    filter: string | null,
  ): Promise<Gasto[]> {
    if (!filter) return items
    const lower = filter.toLowerCase()
    return items.filter(
      (item) =>
        item.tipoDespesa.toLowerCase().includes(lower) ||
        item.nomeFornecedor.toLowerCase().includes(lower) ||
        item.parlamentarIdExterno.includes(lower),
    )
  }

  getEntity(): new (...args: unknown[]) => Gasto {
    return Gasto as unknown as new (
      ...args: unknown[]
    ) => Gasto
  }
}
