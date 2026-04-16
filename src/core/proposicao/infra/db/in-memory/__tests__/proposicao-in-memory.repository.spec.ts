import { describe, expect, it } from 'vitest'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import { ProposicaoFakeBuilder } from '../../../../domain/proposicao-fake.builder'
import { ProposicaoInMemoryRepository } from '../proposicao-in-memory.repository'

describe('ProposicaoInMemoryRepository', () => {
  let repo: ProposicaoInMemoryRepository

  function setup() {
    repo = new ProposicaoInMemoryRepository()
  }

  it('should insert and findById', async () => {
    setup()
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    await repo.insert(prop)

    const found = await repo.findById(prop.proposicaoId)
    expect(found).toBe(prop)
  })

  it('should return null when not found', async () => {
    setup()
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    const found = await repo.findById(prop.proposicaoId)
    expect(found).toBeNull()
  })

  it('should findByIdExterno', async () => {
    setup()
    const prop = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('camara-777')
      .build()
    await repo.insert(prop)

    const found = await repo.findByIdExterno('camara-777')
    expect(found).toBe(prop)
  })

  it('should return null for unknown idExterno', async () => {
    setup()
    const found = await repo.findByIdExterno('inexistente')
    expect(found).toBeNull()
  })

  it('should update an existing proposicao', async () => {
    setup()
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    await repo.insert(prop)

    prop.updateSituacao('APROVADA', 'Aprovada')
    await repo.update(prop)

    const found = await repo.findById(prop.proposicaoId)
    expect(found?.situacao).toBe('APROVADA')
  })

  it('should delete a proposicao', async () => {
    setup()
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    await repo.insert(prop)

    await repo.delete(prop.proposicaoId)
    const found = await repo.findById(prop.proposicaoId)
    expect(found).toBeNull()
  })

  it('should filter by ementa text', async () => {
    setup()
    const p1 = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('camara-1')
      .withEmenta('Sobre saúde pública')
      .build()
    const p2 = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('camara-2')
      .withEmenta('Sobre educação')
      .build()
    await repo.bulkInsert([p1, p2])

    const result = await repo.search(
      new SearchParams({ filter: 'saúde', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].idExterno).toBe('camara-1')
  })

  it('should filter by autor', async () => {
    setup()
    const p1 = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('camara-1')
      .withAutores(['Fulano'])
      .build()
    const p2 = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('camara-2')
      .withAutores(['Beltrano'])
      .build()
    await repo.bulkInsert([p1, p2])

    const result = await repo.search(
      new SearchParams({ filter: 'fulano', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].idExterno).toBe('camara-1')
  })

  it('should sort by ano desc', async () => {
    setup()
    const p1 = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('a')
      .withAno(2023)
      .build()
    const p2 = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('b')
      .withAno(2025)
      .build()
    const p3 = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('c')
      .withAno(2024)
      .build()
    await repo.bulkInsert([p1, p2, p3])

    const result = await repo.search(
      new SearchParams({ sort: 'ano', sortDir: 'desc', perPage: 10 }),
    )
    expect(result.items[0].ano).toBe(2025)
    expect(result.items[2].ano).toBe(2023)
  })

  it('should paginate results', async () => {
    setup()
    const props = ProposicaoFakeBuilder.many(5)
    await repo.bulkInsert(props)

    const page1 = await repo.search(new SearchParams({ page: 1, perPage: 2 }))
    expect(page1.items).toHaveLength(2)
    expect(page1.total).toBe(5)
    expect(page1.lastPage).toBe(3)
  })
})
