import { describe, expect, it } from 'vitest'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import { ProposicaoFakeBuilder } from '../../../../domain/proposicao-fake.builder'
import { ProposicaoId } from '../../../../domain/value-objects/proposicao-id.vo'
import { ProposicaoInMemoryRepository } from '../../../../infra/db/in-memory/proposicao-in-memory.repository'
import { GetProposicaoUseCase } from '../get-proposicao.use-case'

describe('GetProposicaoUseCase', () => {
  it('should return a proposicao by id', async () => {
    const repo = new ProposicaoInMemoryRepository()
    const useCase = new GetProposicaoUseCase(repo)
    const id = new ProposicaoId()
    const prop = ProposicaoFakeBuilder.aProposicao()
      .withProposicaoId(id)
      .build()
    await repo.insert(prop)

    const output = await useCase.execute({ id: id.id })
    expect(output.proposicaoId).toBe(id.id)
    expect(output.idExterno).toBe('camara-12345')
  })

  it('should throw NotFoundError when not found', async () => {
    const repo = new ProposicaoInMemoryRepository()
    const useCase = new GetProposicaoUseCase(repo)
    const id = new ProposicaoId()
    await expect(useCase.execute({ id: id.id })).rejects.toThrow(NotFoundError)
  })
})
