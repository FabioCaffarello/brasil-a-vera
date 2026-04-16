import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { EntityValidationError } from '@/core/shared/domain/errors/validation.error'
import { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import { MembroComissao } from '../../../domain/membro-comissao.entity'
import {
  Parlamentar,
  type ParlamentarCreateCommand,
} from '../../../domain/parlamentar.aggregate'
import type { IParlamentarRepository } from '../../../domain/parlamentar.repository'
import type { TipoParticipacao } from '../../../domain/value-objects/tipo-participacao.vo'
import { type ParlamentarOutput, toOutput } from '../common/parlamentar-output'

export type SyncParlamentarInput = ParlamentarCreateCommand & {
  comissoes?: Array<{
    comissaoId: string
    nomeComissao: string
    tipo: TipoParticipacao
    periodoInicio: Date
    periodoFim: Date | null
  }>
}
export type SyncParlamentarOutput = ParlamentarOutput

export class SyncParlamentarUseCase
  implements IUseCase<SyncParlamentarInput, SyncParlamentarOutput>
{
  constructor(private readonly repo: IParlamentarRepository) {}

  async execute(input: SyncParlamentarInput): Promise<SyncParlamentarOutput> {
    const existing = await this.repo.findByIdExterno(input.idExterno)

    if (existing) {
      existing.changePartido(input.partidoSigla, input.partidoNome)

      if (input.nomeCivil !== undefined || input.cpf !== undefined) {
        existing.updateDetalhes(
          input.nomeCivil ?? existing.nomeCivil,
          input.cpf ?? existing.cpf,
        )
      }

      if (input.comissoes) {
        const membros = input.comissoes.map(
          (c) =>
            new MembroComissao(
              c.comissaoId,
              c.nomeComissao,
              c.tipo,
              new DateRange(c.periodoInicio, c.periodoFim),
            ),
        )
        existing.replaceComissoes(membros)
      }

      existing.validate()
      if (existing.notification.hasErrors()) {
        throw EntityValidationError.fromNotification(existing.notification)
      }
      await this.repo.update(existing)
      return toOutput(existing)
    }

    const parlamentar = Parlamentar.create(input)
    if (parlamentar.notification.hasErrors()) {
      throw EntityValidationError.fromNotification(parlamentar.notification)
    }
    await this.repo.insert(parlamentar)
    return toOutput(parlamentar)
  }
}
