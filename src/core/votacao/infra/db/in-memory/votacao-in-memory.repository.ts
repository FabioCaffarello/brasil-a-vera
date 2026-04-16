import { InMemorySearchableRepository } from '@/core/shared/infra/db/in-memory/in-memory.repository'
import type { VotacaoId } from '../../../domain/value-objects/votacao-id.vo'
import { Votacao } from '../../../domain/votacao.aggregate'
import type { IVotacaoRepository } from '../../../domain/votacao.repository'

export class VotacaoInMemoryRepository
  extends InMemorySearchableRepository<Votacao, VotacaoId>
  implements IVotacaoRepository
{
  sortableFields = ['descricao', 'dataHora', 'orgao', 'createdAt']

  async findByIdExterno(idExterno: string): Promise<Votacao | null> {
    return this.items.find((item) => item.idExterno === idExterno) ?? null
  }

  async findByProposicaoIdExterno(
    proposicaoIdExterno: string,
  ): Promise<Votacao[]> {
    return this.items.filter(
      (item) => item.proposicaoIdExterno === proposicaoIdExterno,
    )
  }

  protected async applyFilter(
    items: Votacao[],
    filter: string | null,
  ): Promise<Votacao[]> {
    if (!filter) return items
    const lower = filter.toLowerCase()
    return items.filter(
      (item) =>
        item.descricao.toLowerCase().includes(lower) ||
        item.orgao.toLowerCase().includes(lower),
    )
  }

  getEntity(): new (...args: unknown[]) => Votacao {
    return Votacao as unknown as new (
      ...args: unknown[]
    ) => Votacao
  }
}
