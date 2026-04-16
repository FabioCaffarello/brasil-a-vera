import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import { Proposicao } from '../../../domain/proposicao.aggregate'
import type { IProposicaoRepository } from '../../../domain/proposicao.repository'
import { ProposicaoId } from '../../../domain/value-objects/proposicao-id.vo'
import {
  type ProposicaoOutput,
  toProposicaoOutput,
} from '../common/proposicao-output'

export type GetProposicaoInput = { id: string }
export type GetProposicaoOutput = ProposicaoOutput

export class GetProposicaoUseCase
  implements IUseCase<GetProposicaoInput, GetProposicaoOutput>
{
  constructor(private readonly repo: IProposicaoRepository) {}

  async execute(input: GetProposicaoInput): Promise<GetProposicaoOutput> {
    const id = new ProposicaoId(input.id)
    const entity = await this.repo.findById(id)

    if (!entity) {
      throw new NotFoundError(id, Proposicao)
    }

    return toProposicaoOutput(entity)
  }
}
