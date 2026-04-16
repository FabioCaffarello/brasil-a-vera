import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { EntityValidationError } from '@/core/shared/domain/errors/validation.error'
import { OrientacaoBancada } from '../../../domain/value-objects/orientacao-bancada.vo'
import type { TipoOrientacao } from '../../../domain/value-objects/tipo-orientacao.vo'
import type { TipoVoto } from '../../../domain/value-objects/tipo-voto.vo'
import {
  Votacao,
  type VotacaoCreateCommand,
} from '../../../domain/votacao.aggregate'
import type { IVotacaoRepository } from '../../../domain/votacao.repository'
import { VotoNominal } from '../../../domain/voto-nominal.entity'
import { toVotacaoOutput, type VotacaoOutput } from '../common/votacao-output'

export type SyncVotacaoInput = VotacaoCreateCommand & {
  votos?: Array<{
    parlamentarIdExterno: string
    tipoVoto: TipoVoto
    dataHora: Date | null
  }>
  orientacoes?: Array<{
    partidoSigla: string
    orientacao: TipoOrientacao
  }>
}

export type SyncVotacaoOutput = VotacaoOutput

export class SyncVotacaoUseCase
  implements IUseCase<SyncVotacaoInput, SyncVotacaoOutput>
{
  constructor(private readonly repo: IVotacaoRepository) {}

  async execute(input: SyncVotacaoInput): Promise<SyncVotacaoOutput> {
    const existing = await this.repo.findByIdExterno(input.idExterno)

    if (existing) {
      existing.validate()
      if (existing.notification.hasErrors()) {
        throw EntityValidationError.fromNotification(existing.notification)
      }
      await this.repo.update(existing)
      return toVotacaoOutput(existing)
    }

    const votacao = Votacao.create(input)

    if (input.votos) {
      for (const v of input.votos) {
        votacao.addVoto(
          new VotoNominal({
            parlamentarIdExterno: v.parlamentarIdExterno,
            tipoVoto: v.tipoVoto,
            dataHora: v.dataHora,
          }),
        )
      }
    }

    if (input.orientacoes) {
      for (const o of input.orientacoes) {
        votacao.addOrientacao(
          new OrientacaoBancada(o.partidoSigla, o.orientacao),
        )
      }
    }

    if (votacao.notification.hasErrors()) {
      throw EntityValidationError.fromNotification(votacao.notification)
    }
    await this.repo.insert(votacao)
    return toVotacaoOutput(votacao)
  }
}
