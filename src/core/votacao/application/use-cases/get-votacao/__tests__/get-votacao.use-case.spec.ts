import { describe, expect, it } from 'vitest'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import { VotacaoId } from '../../../../domain/value-objects/votacao-id.vo'
import { VotacaoFakeBuilder } from '../../../../domain/votacao-fake.builder'
import { VotacaoInMemoryRepository } from '../../../../infra/db/in-memory/votacao-in-memory.repository'
import { GetVotacaoUseCase } from '../get-votacao.use-case'

describe('GetVotacaoUseCase', () => {
  it('should return a votacao by id', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new GetVotacaoUseCase(repo)
    const id = new VotacaoId()
    const votacao = VotacaoFakeBuilder.aVotacao().withVotacaoId(id).build()
    await repo.insert(votacao)

    const output = await useCase.execute({ id: id.id })
    expect(output.votacaoId).toBe(id.id)
    expect(output.descricao).toBe('PL 1234/2024 - Emenda substitutiva')
  })

  it('should throw NotFoundError', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new GetVotacaoUseCase(repo)
    const id = new VotacaoId()
    await expect(useCase.execute({ id: id.id })).rejects.toThrow(NotFoundError)
  })
})
