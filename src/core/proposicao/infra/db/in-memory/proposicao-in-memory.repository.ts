import { InMemorySearchableRepository } from '@/core/shared/infra/db/in-memory/in-memory.repository'
import { Proposicao } from '../../../domain/proposicao.aggregate'
import type { IProposicaoRepository } from '../../../domain/proposicao.repository'
import type { ProposicaoId } from '../../../domain/value-objects/proposicao-id.vo'

export class ProposicaoInMemoryRepository
  extends InMemorySearchableRepository<Proposicao, ProposicaoId>
  implements IProposicaoRepository
{
  sortableFields = ['ano', 'numero', 'dataApresentacao', 'createdAt']

  async findByIdExterno(idExterno: string): Promise<Proposicao | null> {
    return this.items.find((item) => item.idExterno === idExterno) ?? null
  }

  protected async applyFilter(
    items: Proposicao[],
    filter: string | null,
  ): Promise<Proposicao[]> {
    if (!filter) return items
    const lower = filter.toLowerCase()
    return items.filter(
      (item) =>
        item.ementa.toLowerCase().includes(lower) ||
        item.idExterno.toLowerCase().includes(lower) ||
        item.tipo.toLowerCase().includes(lower) ||
        item.autores.some((a) => a.toLowerCase().includes(lower)),
    )
  }

  getEntity(): new (...args: unknown[]) => Proposicao {
    return Proposicao as unknown as new (
      ...args: unknown[]
    ) => Proposicao
  }
}
