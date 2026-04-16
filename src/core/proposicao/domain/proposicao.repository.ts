import type { ISearchableRepository } from '@/core/shared/domain/repository/repository.interface'
import type { Proposicao } from './proposicao.aggregate'
import type { ProposicaoId } from './value-objects/proposicao-id.vo'

export type ProposicaoFilter = string

export interface IProposicaoRepository
  extends ISearchableRepository<Proposicao, ProposicaoId, ProposicaoFilter> {
  findByIdExterno(idExterno: string): Promise<Proposicao | null>
}
