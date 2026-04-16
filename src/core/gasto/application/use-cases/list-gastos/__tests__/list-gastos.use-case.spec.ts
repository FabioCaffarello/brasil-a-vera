import { describe, expect, it } from 'vitest'
import { GastoFakeBuilder } from '../../../../domain/gasto-fake.builder'
import { GastoInMemoryRepository } from '../../../../infra/db/in-memory/gasto-in-memory.repository'
import { ListGastosUseCase } from '../list-gastos.use-case'

describe('ListGastosUseCase', () => {
  let repo: GastoInMemoryRepository
  let useCase: ListGastosUseCase

  function setup() {
    repo = new GastoInMemoryRepository()
    useCase = new ListGastosUseCase(repo)
  }

  it('should list all gastos with pagination', async () => {
    setup()
    const gastos = GastoFakeBuilder.many(5)
    await repo.bulkInsert(gastos)

    const output = await useCase.execute({ page: 1, perPage: 10 })

    expect(output.items).toHaveLength(5)
    expect(output.total).toBe(5)
  })

  it('should filter gastos by parlamentarIdExterno', async () => {
    setup()
    const gastos = GastoFakeBuilder.many(10)
    await repo.bulkInsert(gastos)

    const output = await useCase.execute({
      parlamentarIdExterno: '10000',
    })

    expect(output.items.length).toBeGreaterThan(0)
    for (const item of output.items) {
      expect(item.parlamentarIdExterno).toBe('10000')
    }
  })
})
