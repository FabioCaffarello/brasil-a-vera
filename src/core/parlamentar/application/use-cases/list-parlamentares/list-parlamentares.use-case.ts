import type { PaginationOutput } from '@/core/shared/application/pagination-output'
import { toPaginationOutput } from '@/core/shared/application/pagination-output'
import type { SearchInput } from '@/core/shared/application/search-input'
import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import type {
  IParlamentarRepository,
  ParlamentarFilter,
} from '../../../domain/parlamentar.repository'
import { type ParlamentarOutput, toOutput } from '../common/parlamentar-output'

export type ListParlamentaresInput = SearchInput<ParlamentarFilter>
export type ListParlamentaresOutput = PaginationOutput<ParlamentarOutput>

export class ListParlamentaresUseCase
  implements IUseCase<ListParlamentaresInput, ListParlamentaresOutput>
{
  constructor(private readonly repo: IParlamentarRepository) {}

  async execute(
    input: ListParlamentaresInput,
  ): Promise<ListParlamentaresOutput> {
    const params = new SearchParams<ParlamentarFilter>({
      page: input.page,
      perPage: input.perPage,
      sort: input.sort,
      sortDir: input.sortDir,
      filter: input.filter,
    })

    const result = await this.repo.search(params)
    const items = result.items.map(toOutput)

    return toPaginationOutput(items, result)
  }
}
