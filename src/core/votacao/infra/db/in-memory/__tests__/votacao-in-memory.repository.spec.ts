import { describe, expect, it } from 'vitest'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import { VotacaoFakeBuilder } from '../../../../domain/votacao-fake.builder'
import { VotacaoInMemoryRepository } from '../votacao-in-memory.repository'

describe('VotacaoInMemoryRepository', () => {
  it('should find by idExterno', async () => {
    const repo = new VotacaoInMemoryRepository()
    const votacao = VotacaoFakeBuilder.aVotacao().withIdExterno('99999').build()
    await repo.insert(votacao)

    const found = await repo.findByIdExterno('99999')
    expect(found).toBe(votacao)
  })

  it('should return null when idExterno not found', async () => {
    const repo = new VotacaoInMemoryRepository()
    const found = await repo.findByIdExterno('nonexistent')
    expect(found).toBeNull()
  })

  it('should find by proposicaoIdExterno', async () => {
    const repo = new VotacaoInMemoryRepository()
    const v1 = VotacaoFakeBuilder.aVotacao()
      .withProposicaoIdExterno('PL-123')
      .withIdExterno('1')
      .build()
    const v2 = VotacaoFakeBuilder.aVotacao()
      .withProposicaoIdExterno('PL-456')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([v1, v2])

    const found = await repo.findByProposicaoIdExterno('PL-123')
    expect(found).toHaveLength(1)
  })

  it('should filter by descricao', async () => {
    const repo = new VotacaoInMemoryRepository()
    const v1 = VotacaoFakeBuilder.aVotacao()
      .withDescricao('PL 1234/2024')
      .withIdExterno('1')
      .build()
    const v2 = VotacaoFakeBuilder.aVotacao()
      .withDescricao('PEC 45/2019')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([v1, v2])

    const result = await repo.search(
      new SearchParams({ filter: 'PEC', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].descricao).toBe('PEC 45/2019')
  })

  it('should filter by orgao', async () => {
    const repo = new VotacaoInMemoryRepository()
    const v1 = VotacaoFakeBuilder.aVotacao()
      .withOrgao('Plenário')
      .withIdExterno('1')
      .build()
    const v2 = VotacaoFakeBuilder.aVotacao()
      .withOrgao('Comissão Especial')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([v1, v2])

    const result = await repo.search(
      new SearchParams({ filter: 'Comissão', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
  })

  it('should sort by descricao', async () => {
    const repo = new VotacaoInMemoryRepository()
    await repo.bulkInsert(VotacaoFakeBuilder.many(3))

    const result = await repo.search(
      new SearchParams({ sort: 'descricao', sortDir: 'asc', perPage: 10 }),
    )
    expect(result.items[0].descricao).toBe('Votação 1')
    expect(result.items[2].descricao).toBe('Votação 3')
  })
})
