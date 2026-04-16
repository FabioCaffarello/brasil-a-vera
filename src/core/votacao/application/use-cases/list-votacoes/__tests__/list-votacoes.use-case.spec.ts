import { describe, expect, it } from 'vitest'
import { VotacaoFakeBuilder } from '../../../../domain/votacao-fake.builder'
import { VotacaoInMemoryRepository } from '../../../../infra/db/in-memory/votacao-in-memory.repository'
import { ListVotacoesUseCase } from '../list-votacoes.use-case'

describe('ListVotacoesUseCase', () => {
  it('should return paginated results', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new ListVotacoesUseCase(repo)
    await repo.bulkInsert(VotacaoFakeBuilder.many(5))

    const output = await useCase.execute({ page: 1, perPage: 2 })
    expect(output.items).toHaveLength(2)
    expect(output.total).toBe(5)
    expect(output.lastPage).toBe(3)
  })

  it('should filter by descricao', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new ListVotacoesUseCase(repo)
    const v1 = VotacaoFakeBuilder.aVotacao()
      .withDescricao('PL 1234/2024')
      .withIdExterno('1')
      .build()
    const v2 = VotacaoFakeBuilder.aVotacao()
      .withDescricao('PEC 45/2019')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([v1, v2])

    const output = await useCase.execute({ filter: 'PEC', perPage: 10 })
    expect(output.items).toHaveLength(1)
    expect(output.items[0].descricao).toBe('PEC 45/2019')
  })

  it('should return empty when no votacoes', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new ListVotacoesUseCase(repo)
    const output = await useCase.execute({ perPage: 10 })
    expect(output.items).toHaveLength(0)
    expect(output.total).toBe(0)
  })
})
