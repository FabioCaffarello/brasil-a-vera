import type { PaginationOutput } from '@/core/shared/application/pagination-output'
import { toPaginationOutput } from '@/core/shared/application/pagination-output'
import type { SearchInput } from '@/core/shared/application/search-input'
import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import type {
  GastoFilter,
  IGastoRepository,
} from '../../../domain/gasto.repository'
import { type GastoOutput, toGastoOutput } from '../common/gasto-output'

export type ListGastosInput = SearchInput<GastoFilter> & {
  parlamentarIdExterno?: string | null
}
export type ListGastosOutput = PaginationOutput<GastoOutput>

export class ListGastosUseCase
  implements IUseCase<ListGastosInput, ListGastosOutput>
{
  constructor(private readonly repo: IGastoRepository) {}

  async execute(input: ListGastosInput): Promise<ListGastosOutput> {
    if (input.parlamentarIdExterno) {
      const items = await this.repo.findByParlamentarIdExterno(
        input.parlamentarIdExterno,
      )
      return {
        items: items.map(toGastoOutput),
        total: items.length,
        currentPage: 1,
        perPage: items.length,
        lastPage: 1,
      }
    }

    const params = new SearchParams<GastoFilter>({
      page: input.page,
      perPage: input.perPage,
      sort: input.sort,
      sortDir: input.sortDir,
      filter: input.filter,
    })

    const result = await this.repo.search(params)
    const items = result.items.map(toGastoOutput)

    return toPaginationOutput(items, result)
  }
}
