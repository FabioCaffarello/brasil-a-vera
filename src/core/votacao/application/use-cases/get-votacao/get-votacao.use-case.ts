import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import { VotacaoId } from '../../../domain/value-objects/votacao-id.vo'
import { Votacao } from '../../../domain/votacao.aggregate'
import type { IVotacaoRepository } from '../../../domain/votacao.repository'
import { toVotacaoOutput, type VotacaoOutput } from '../common/votacao-output'

export type GetVotacaoInput = { id: string }
export type GetVotacaoOutput = VotacaoOutput

export class GetVotacaoUseCase
  implements IUseCase<GetVotacaoInput, GetVotacaoOutput>
{
  constructor(private readonly repo: IVotacaoRepository) {}

  async execute(input: GetVotacaoInput): Promise<GetVotacaoOutput> {
    const id = new VotacaoId(input.id)
    const entity = await this.repo.findById(id)

    if (!entity) {
      throw new NotFoundError(id, Votacao)
    }

    return toVotacaoOutput(entity)
  }
}
