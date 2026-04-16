import { InMemorySearchableRepository } from '@/core/shared/infra/db/in-memory/in-memory.repository'
import { Parlamentar } from '../../../domain/parlamentar.aggregate'
import type { IParlamentarRepository } from '../../../domain/parlamentar.repository'
import type { ParlamentarId } from '../../../domain/value-objects/parlamentar-id.vo'

export class ParlamentarInMemoryRepository
  extends InMemorySearchableRepository<Parlamentar, ParlamentarId>
  implements IParlamentarRepository
{
  sortableFields = ['nome', 'uf', 'createdAt']

  async findByIdExterno(idExterno: string): Promise<Parlamentar | null> {
    return this.items.find((item) => item.idExterno === idExterno) ?? null
  }

  protected async applyFilter(
    items: Parlamentar[],
    filter: string | null,
  ): Promise<Parlamentar[]> {
    if (!filter) return items
    const lower = filter.toLowerCase()
    return items.filter(
      (item) =>
        item.nome.toLowerCase().includes(lower) ||
        item.partidoAtual.sigla.toLowerCase().includes(lower) ||
        item.uf.toLowerCase().includes(lower),
    )
  }

  getEntity(): new (...args: unknown[]) => Parlamentar {
    return Parlamentar as unknown as new (
      ...args: unknown[]
    ) => Parlamentar
  }
}
