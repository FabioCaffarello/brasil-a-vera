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
      // Sobrescrever campos do agregado com o command atual e
      // re-validar (descricao/orgao/dataHora podem ter mudado).
      existing.updateFrom(input)
      existing.replaceVotos(buildVotos(input.votos))
      existing.replaceOrientacoes(buildOrientacoes(input.orientacoes))
      existing.validate()
      if (existing.notification.hasErrors()) {
        throw EntityValidationError.fromNotification(existing.notification)
      }
      await this.repo.update(existing)
      return toVotacaoOutput(existing)
    }

    const votacao = Votacao.create(input)

    for (const voto of buildVotos(input.votos)) {
      votacao.addVoto(voto)
    }

    for (const o of buildOrientacoes(input.orientacoes)) {
      votacao.addOrientacao(o)
    }

    if (votacao.notification.hasErrors()) {
      throw EntityValidationError.fromNotification(votacao.notification)
    }
    await this.repo.insert(votacao)
    return toVotacaoOutput(votacao)
  }
}

function buildVotos(input: SyncVotacaoInput['votos']): VotoNominal[] {
  if (!input) return []
  return input.map(
    (v) =>
      new VotoNominal({
        parlamentarIdExterno: v.parlamentarIdExterno,
        tipoVoto: v.tipoVoto,
        dataHora: v.dataHora,
      }),
  )
}

function buildOrientacoes(
  input: SyncVotacaoInput['orientacoes'],
): OrientacaoBancada[] {
  if (!input) return []
  return input.map((o) => new OrientacaoBancada(o.partidoSigla, o.orientacao))
}
