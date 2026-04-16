import type { PaginationOutput } from '@/core/shared/application/pagination-output'
import { toPaginationOutput } from '@/core/shared/application/pagination-output'
import type { SearchInput } from '@/core/shared/application/search-input'
import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import type {
  IVotacaoRepository,
  VotacaoFilter,
} from '../../../domain/votacao.repository'
import { toVotacaoOutput, type VotacaoOutput } from '../common/votacao-output'

export type ListVotacoesInput = SearchInput<VotacaoFilter>
export type ListVotacoesOutput = PaginationOutput<VotacaoOutput>

export class ListVotacoesUseCase
  implements IUseCase<ListVotacoesInput, ListVotacoesOutput>
{
  constructor(private readonly repo: IVotacaoRepository) {}

  async execute(input: ListVotacoesInput): Promise<ListVotacoesOutput> {
    const params = new SearchParams<VotacaoFilter>({
      page: input.page,
      perPage: input.perPage,
      sort: input.sort,
      sortDir: input.sortDir,
      filter: input.filter,
    })

    const result = await this.repo.search(params)
    const items = result.items.map(toVotacaoOutput)

    return toPaginationOutput(items, result)
  }
}
