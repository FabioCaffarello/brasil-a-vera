import { describe, expect, it } from 'vitest'
import { ParlamentarFakeBuilder } from '../../../../domain/parlamentar-fake.builder'
import { ParlamentarInMemoryRepository } from '../../../../infra/db/in-memory/parlamentar-in-memory.repository'
import { ListParlamentaresUseCase } from '../list-parlamentares.use-case'

describe('ListParlamentaresUseCase', () => {
  let repo: ParlamentarInMemoryRepository
  let useCase: ListParlamentaresUseCase

  function setup() {
    repo = new ParlamentarInMemoryRepository()
    useCase = new ListParlamentaresUseCase(repo)
  }

  it('should return paginated results', async () => {
    setup()
    const parlamentares = ParlamentarFakeBuilder.many(5)
    await repo.bulkInsert(parlamentares)

    const output = await useCase.execute({ page: 1, perPage: 2 })

    expect(output.items).toHaveLength(2)
    expect(output.total).toBe(5)
    expect(output.currentPage).toBe(1)
    expect(output.lastPage).toBe(3)
  })

  it('should filter by name', async () => {
    setup()
    const p1 = ParlamentarFakeBuilder.aParlamentar()
      .withNome('João da Silva')
      .build()
    const p2 = ParlamentarFakeBuilder.aParlamentar()
      .withNome('Maria Santos')
      .build()
    await repo.bulkInsert([p1, p2])

    const output = await useCase.execute({
      filter: 'maria',
      perPage: 10,
    })

    expect(output.items).toHaveLength(1)
    expect(output.items[0].nome).toBe('Maria Santos')
  })

  it('should sort by nome', async () => {
    setup()
    const p1 = ParlamentarFakeBuilder.aParlamentar()
      .withNome('Zé')
      .withIdExterno('1')
      .build()
    const p2 = ParlamentarFakeBuilder.aParlamentar()
      .withNome('Ana')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([p1, p2])

    const output = await useCase.execute({
      sort: 'nome',
      sortDir: 'asc',
      perPage: 10,
    })

    expect(output.items[0].nome).toBe('Ana')
    expect(output.items[1].nome).toBe('Zé')
  })

  it('should return empty when no parlamentares', async () => {
    setup()
    const output = await useCase.execute({ perPage: 10 })

    expect(output.items).toHaveLength(0)
    expect(output.total).toBe(0)
  })
})
