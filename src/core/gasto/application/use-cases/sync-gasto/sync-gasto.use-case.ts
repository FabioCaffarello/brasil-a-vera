import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { EntityValidationError } from '@/core/shared/domain/errors/validation.error'
import { Gasto, type GastoCreateCommand } from '../../../domain/gasto.aggregate'
import type { IGastoRepository } from '../../../domain/gasto.repository'
import { type GastoOutput, toGastoOutput } from '../common/gasto-output'

export type SyncGastoInput = GastoCreateCommand
export type SyncGastoOutput = GastoOutput

export class SyncGastoUseCase
  implements IUseCase<SyncGastoInput, SyncGastoOutput>
{
  constructor(private readonly repo: IGastoRepository) {}

  async execute(input: SyncGastoInput): Promise<SyncGastoOutput> {
    const existing = await this.repo.findByCodDocumento(input.codDocumento)

    if (existing) {
      await this.repo.update(existing)
      return toGastoOutput(existing)
    }

    const gasto = Gasto.create(input)
    if (gasto.notification.hasErrors()) {
      throw EntityValidationError.fromNotification(gasto.notification)
    }
    await this.repo.insert(gasto)
    return toGastoOutput(gasto)
  }
}
