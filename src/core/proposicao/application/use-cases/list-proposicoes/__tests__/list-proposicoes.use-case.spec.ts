import { describe, expect, it } from 'vitest'
import { ProposicaoFakeBuilder } from '../../../../domain/proposicao-fake.builder'
import { ProposicaoInMemoryRepository } from '../../../../infra/db/in-memory/proposicao-in-memory.repository'
import { ListProposicoesUseCase } from '../list-proposicoes.use-case'

describe('ListProposicoesUseCase', () => {
  let repo: ProposicaoInMemoryRepository
  let useCase: ListProposicoesUseCase

  function setup() {
    repo = new ProposicaoInMemoryRepository()
    useCase = new ListProposicoesUseCase(repo)
  }

  it('should list all proposicoes with pagination', async () => {
    setup()
    await repo.bulkInsert(ProposicaoFakeBuilder.many(5))

    const output = await useCase.execute({ page: 1, perPage: 10 })

    expect(output.items).toHaveLength(5)
    expect(output.total).toBe(5)
  })

  it('should filter by casa', async () => {
    setup()
    await repo.bulkInsert(ProposicaoFakeBuilder.many(6))

    const output = await useCase.execute({
      page: 1,
      perPage: 100,
      casa: 'CAMARA',
    })

    expect(output.items.length).toBeGreaterThan(0)
    for (const item of output.items) {
      expect(item.casa).toBe('CAMARA')
    }
  })

  it('should filter by tipo', async () => {
    setup()
    const props = [
      ProposicaoFakeBuilder.aProposicao()
        .withIdExterno('a')
        .withTipo('PL')
        .build(),
      ProposicaoFakeBuilder.aProposicao()
        .withIdExterno('b')
        .withTipo('PEC')
        .build(),
    ]
    await repo.bulkInsert(props)

    const output = await useCase.execute({
      page: 1,
      perPage: 100,
      tipo: 'pec', // case-insensitive
    })

    expect(output.items).toHaveLength(1)
    expect(output.items[0].tipo).toBe('PEC')
  })

  it('should filter by ano', async () => {
    setup()
    const props = [
      ProposicaoFakeBuilder.aProposicao()
        .withIdExterno('a')
        .withAno(2024)
        .build(),
      ProposicaoFakeBuilder.aProposicao()
        .withIdExterno('b')
        .withAno(2025)
        .build(),
    ]
    await repo.bulkInsert(props)

    const output = await useCase.execute({
      page: 1,
      perPage: 100,
      ano: 2025,
    })

    expect(output.items).toHaveLength(1)
    expect(output.items[0].ano).toBe(2025)
  })

  it('should filter by situacao', async () => {
    setup()
    const props = [
      ProposicaoFakeBuilder.aProposicao()
        .withIdExterno('a')
        .withSituacao('TRAMITANDO')
        .build(),
      ProposicaoFakeBuilder.aProposicao()
        .withIdExterno('b')
        .withSituacao('APROVADA')
        .build(),
    ]
    await repo.bulkInsert(props)

    const output = await useCase.execute({
      page: 1,
      perPage: 100,
      situacao: 'APROVADA',
    })

    expect(output.items).toHaveLength(1)
    expect(output.items[0].situacao).toBe('APROVADA')
  })
})
