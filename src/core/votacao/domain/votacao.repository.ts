import type { ISearchableRepository } from '@/core/shared/domain/repository/repository.interface'
import type { VotacaoId } from './value-objects/votacao-id.vo'
import type { Votacao } from './votacao.aggregate'

export type VotacaoFilter = string

export interface IVotacaoRepository
  extends ISearchableRepository<Votacao, VotacaoId, VotacaoFilter> {
  findByIdExterno(idExterno: string): Promise<Votacao | null>
  findByProposicaoIdExterno(proposicaoIdExterno: string): Promise<Votacao[]>
}
