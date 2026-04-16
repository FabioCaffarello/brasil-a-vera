import { describe, expect, it } from 'vitest'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import { ParlamentarFakeBuilder } from '../../../../domain/parlamentar-fake.builder'
import { ParlamentarInMemoryRepository } from '../parlamentar-in-memory.repository'

describe('ParlamentarInMemoryRepository', () => {
  let repo: ParlamentarInMemoryRepository

  function setup() {
    repo = new ParlamentarInMemoryRepository()
  }

  it('should find by idExterno', async () => {
    setup()
    const parlamentar = ParlamentarFakeBuilder.aParlamentar()
      .withIdExterno('99999')
      .build()
    await repo.insert(parlamentar)

    const found = await repo.findByIdExterno('99999')
    expect(found).toBe(parlamentar)
  })

  it('should return null when idExterno not found', async () => {
    setup()
    const found = await repo.findByIdExterno('nonexistent')
    expect(found).toBeNull()
  })

  it('should filter by nome', async () => {
    setup()
    const p1 = ParlamentarFakeBuilder.aParlamentar()
      .withNome('João da Silva')
      .withIdExterno('1')
      .build()
    const p2 = ParlamentarFakeBuilder.aParlamentar()
      .withNome('Maria Santos')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([p1, p2])

    const result = await repo.search(
      new SearchParams({ filter: 'joão', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].nome).toBe('João da Silva')
  })

  it('should filter by partido sigla', async () => {
    setup()
    const p1 = ParlamentarFakeBuilder.aParlamentar()
      .withPartido('PT', 'Partido dos Trabalhadores')
      .withIdExterno('1')
      .build()
    const p2 = ParlamentarFakeBuilder.aParlamentar()
      .withPartido('PL', 'Partido Liberal')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([p1, p2])

    const result = await repo.search(
      new SearchParams({ filter: 'PL', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].partidoAtual.sigla).toBe('PL')
  })

  it('should filter by UF', async () => {
    setup()
    const p1 = ParlamentarFakeBuilder.aParlamentar()
      .withUf('SP')
      .withIdExterno('1')
      .build()
    const p2 = ParlamentarFakeBuilder.aParlamentar()
      .withUf('RJ')
      .withIdExterno('2')
      .build()
    await repo.bulkInsert([p1, p2])

    const result = await repo.search(
      new SearchParams({ filter: 'RJ', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].uf).toBe('RJ')
  })

  it('should sort by nome', async () => {
    setup()
    const parlamentares = ParlamentarFakeBuilder.many(3)
    await repo.bulkInsert(parlamentares)

    const result = await repo.search(
      new SearchParams({ sort: 'nome', sortDir: 'asc', perPage: 10 }),
    )

    expect(result.items[0].nome).toBe('Parlamentar 1')
    expect(result.items[2].nome).toBe('Parlamentar 3')
  })
})
