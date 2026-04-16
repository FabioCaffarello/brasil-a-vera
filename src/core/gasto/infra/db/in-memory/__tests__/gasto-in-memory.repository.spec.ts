import { describe, expect, it } from 'vitest'
import { SearchParams } from '@/core/shared/domain/repository/search-params'
import { GastoFakeBuilder } from '../../../../domain/gasto-fake.builder'
import { GastoInMemoryRepository } from '../gasto-in-memory.repository'

describe('GastoInMemoryRepository', () => {
  let repo: GastoInMemoryRepository

  function setup() {
    repo = new GastoInMemoryRepository()
  }

  it('should insert and findById', async () => {
    setup()
    const gasto = GastoFakeBuilder.aGasto().build()
    await repo.insert(gasto)

    const found = await repo.findById(gasto.gastoId)
    expect(found).toBe(gasto)
  })

  it('should return null when not found', async () => {
    setup()
    const gasto = GastoFakeBuilder.aGasto().build()
    const found = await repo.findById(gasto.gastoId)
    expect(found).toBeNull()
  })

  it('should findAll', async () => {
    setup()
    const gastos = GastoFakeBuilder.many(3)
    await repo.bulkInsert(gastos)

    const all = await repo.findAll()
    expect(all).toHaveLength(3)
  })

  it('should update an existing gasto', async () => {
    setup()
    const gasto = GastoFakeBuilder.aGasto().build()
    await repo.insert(gasto)

    gasto.valorDocumento = 9999.99
    await repo.update(gasto)

    const found = await repo.findById(gasto.gastoId)
    expect(found?.valorDocumento).toBe(9999.99)
  })

  it('should delete a gasto', async () => {
    setup()
    const gasto = GastoFakeBuilder.aGasto().build()
    await repo.insert(gasto)

    await repo.delete(gasto.gastoId)
    const found = await repo.findById(gasto.gastoId)
    expect(found).toBeNull()
  })

  it('should findByCodDocumento', async () => {
    setup()
    const gasto = GastoFakeBuilder.aGasto().withCodDocumento(777).build()
    await repo.insert(gasto)

    const found = await repo.findByCodDocumento(777)
    expect(found).toBe(gasto)
  })

  it('should return null for unknown codDocumento', async () => {
    setup()
    const found = await repo.findByCodDocumento(999999)
    expect(found).toBeNull()
  })

  it('should findByParlamentarIdExterno', async () => {
    setup()
    const g1 = GastoFakeBuilder.aGasto()
      .withParlamentarIdExterno('AAA')
      .withCodDocumento(1)
      .build()
    const g2 = GastoFakeBuilder.aGasto()
      .withParlamentarIdExterno('AAA')
      .withCodDocumento(2)
      .build()
    const g3 = GastoFakeBuilder.aGasto()
      .withParlamentarIdExterno('BBB')
      .withCodDocumento(3)
      .build()
    await repo.bulkInsert([g1, g2, g3])

    const result = await repo.findByParlamentarIdExterno('AAA')
    expect(result).toHaveLength(2)
  })

  it('should filter by tipoDespesa', async () => {
    setup()
    const g1 = GastoFakeBuilder.aGasto()
      .withTipoDespesa('COMBUSTÍVEIS')
      .withCodDocumento(1)
      .build()
    const g2 = GastoFakeBuilder.aGasto()
      .withTipoDespesa('ALIMENTAÇÃO')
      .withCodDocumento(2)
      .build()
    await repo.bulkInsert([g1, g2])

    const result = await repo.search(
      new SearchParams({ filter: 'combust', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].tipoDespesa).toBe('COMBUSTÍVEIS')
  })

  it('should filter by nomeFornecedor', async () => {
    setup()
    const g1 = GastoFakeBuilder.aGasto()
      .withNomeFornecedor('Posto XYZ')
      .withCodDocumento(1)
      .build()
    const g2 = GastoFakeBuilder.aGasto()
      .withNomeFornecedor('Restaurante ABC')
      .withCodDocumento(2)
      .build()
    await repo.bulkInsert([g1, g2])

    const result = await repo.search(
      new SearchParams({ filter: 'posto', perPage: 10 }),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0].nomeFornecedor).toBe('Posto XYZ')
  })

  it('should sort by valorDocumento', async () => {
    setup()
    const g1 = GastoFakeBuilder.aGasto()
      .withValorDocumento(500)
      .withCodDocumento(1)
      .build()
    const g2 = GastoFakeBuilder.aGasto()
      .withValorDocumento(100)
      .withCodDocumento(2)
      .build()
    const g3 = GastoFakeBuilder.aGasto()
      .withValorDocumento(300)
      .withCodDocumento(3)
      .build()
    await repo.bulkInsert([g1, g2, g3])

    const result = await repo.search(
      new SearchParams({
        sort: 'valorDocumento',
        sortDir: 'asc',
        perPage: 10,
      }),
    )
    expect(result.items[0].valorDocumento).toBe(100)
    expect(result.items[2].valorDocumento).toBe(500)
  })

  it('should paginate results', async () => {
    setup()
    const gastos = GastoFakeBuilder.many(5)
    await repo.bulkInsert(gastos)

    const page1 = await repo.search(new SearchParams({ page: 1, perPage: 2 }))
    expect(page1.items).toHaveLength(2)
    expect(page1.total).toBe(5)
    expect(page1.lastPage).toBe(3)

    const page3 = await repo.search(new SearchParams({ page: 3, perPage: 2 }))
    expect(page3.items).toHaveLength(1)
  })
})
