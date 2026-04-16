import type { PaginationOutput } from '@/core/shared/application/pagination-output'
import { toPaginationOutput } from '@/core/shared/application/pagination-output'
import type { SearchInput } from '@/core/shared/application/search-input'
import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import type {
  IProposicaoRepository,
  ProposicaoFilter,
} from '../../../domain/proposicao.repository'
import {
  type ProposicaoOutput,
  toProposicaoOutput,
} from '../common/proposicao-output'

export type ListProposicoesInput = SearchInput<ProposicaoFilter> & {
  // Filtros estruturados (Wave 1: aplicados client-side via search depois)
  casa?: string | null
  tipo?: string | null
  ano?: number | null
  situacao?: string | null
}
export type ListProposicoesOutput = PaginationOutput<ProposicaoOutput>

export class ListProposicoesUseCase
  implements IUseCase<ListProposicoesInput, ListProposicoesOutput>
{
  constructor(private readonly repo: IProposicaoRepository) {}

  async execute(input: ListProposicoesInput): Promise<ListProposicoesOutput> {
    const params = new SearchParams<ProposicaoFilter>({
      page: input.page,
      perPage: input.perPage,
      sort: input.sort,
      sortDir: input.sortDir,
      filter: input.filter,
    })

    const result = await this.repo.search(params)
    let items = result.items

    // Filtros estruturados aplicados após busca textual.
    // Wave 2: empurrar para SQL quando volume justificar.
    if (input.casa) {
      const casa = input.casa.toUpperCase()
      items = items.filter((i) => i.casa === casa)
    }
    if (input.tipo) {
      const tipo = input.tipo.toUpperCase()
      items = items.filter((i) => i.tipo === tipo)
    }
    if (input.ano) {
      items = items.filter((i) => i.ano === input.ano)
    }
    if (input.situacao) {
      const situacao = input.situacao.toUpperCase()
      items = items.filter((i) => i.situacao === situacao)
    }

    return toPaginationOutput(items.map(toProposicaoOutput), result)
  }
}
