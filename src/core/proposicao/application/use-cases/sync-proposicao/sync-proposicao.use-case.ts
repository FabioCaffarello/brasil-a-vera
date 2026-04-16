import type { IUseCase } from '@/core/shared/application/use-case.interface'
import { EntityValidationError } from '@/core/shared/domain/errors/validation.error'
import {
  Proposicao,
  type ProposicaoCreateCommand,
} from '../../../domain/proposicao.aggregate'
import type { IProposicaoRepository } from '../../../domain/proposicao.repository'
import { Tema } from '../../../domain/value-objects/tema.vo'
import {
  type ProposicaoOutput,
  toProposicaoOutput,
} from '../common/proposicao-output'

export type SyncProposicaoInput = ProposicaoCreateCommand
export type SyncProposicaoOutput = ProposicaoOutput

export class SyncProposicaoUseCase
  implements IUseCase<SyncProposicaoInput, SyncProposicaoOutput>
{
  constructor(private readonly repo: IProposicaoRepository) {}

  async execute(input: SyncProposicaoInput): Promise<SyncProposicaoOutput> {
    const existing = await this.repo.findByIdExterno(input.idExterno)

    if (existing) {
      // Wave 1: na atualização, refrescamos situação, ementa-detalhada,
      // temas e autores. Histórico de tramitação fica para Wave 2.
      existing.updateSituacao(
        input.situacao ?? 'DESCONHECIDA',
        input.situacaoDescricao ?? null,
      )
      existing.replaceTemas((input.temas ?? []).map((t) => new Tema(t)))
      existing.replaceAutores(input.autores ?? [])
      await this.repo.update(existing)
      return toProposicaoOutput(existing)
    }

    const prop = Proposicao.create(input)
    if (prop.notification.hasErrors()) {
      throw EntityValidationError.fromNotification(prop.notification)
    }
    await this.repo.insert(prop)
    return toProposicaoOutput(prop)
  }
}
