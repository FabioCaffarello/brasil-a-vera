import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import { Parlamentar } from '../../../domain/parlamentar.aggregate'
import type { IParlamentarRepository } from '../../../domain/parlamentar.repository'
import { ParlamentarId } from '../../../domain/value-objects/parlamentar-id.vo'
import { type ParlamentarOutput, toOutput } from '../common/parlamentar-output'

export type GetParlamentarInput = { id: string }
export type GetParlamentarOutput = ParlamentarOutput

export class GetParlamentarUseCase
  implements IUseCase<GetParlamentarInput, GetParlamentarOutput>
{
  constructor(private readonly repo: IParlamentarRepository) {}

  async execute(input: GetParlamentarInput): Promise<GetParlamentarOutput> {
    const id = new ParlamentarId(input.id)
    const entity = await this.repo.findById(id)

    if (!entity) {
      throw new NotFoundError(id, Parlamentar)
    }

    return toOutput(entity)
  }
}
