import { describe, expect, it } from 'vitest'
import { NotFoundError } from '@/core/shared/domain/errors/not-found.error'
import { ParlamentarFakeBuilder } from '../../../../domain/parlamentar-fake.builder'
import { ParlamentarId } from '../../../../domain/value-objects/parlamentar-id.vo'
import { ParlamentarInMemoryRepository } from '../../../../infra/db/in-memory/parlamentar-in-memory.repository'
import { GetParlamentarUseCase } from '../get-parlamentar.use-case'

describe('GetParlamentarUseCase', () => {
  let repo: ParlamentarInMemoryRepository
  let useCase: GetParlamentarUseCase

  function setup() {
    repo = new ParlamentarInMemoryRepository()
    useCase = new GetParlamentarUseCase(repo)
  }

  it('should return a parlamentar by id', async () => {
    setup()
    const id = new ParlamentarId()
    const parlamentar = ParlamentarFakeBuilder.aParlamentar()
      .withParlamentarId(id)
      .withNome('João da Silva')
      .build()

    await repo.insert(parlamentar)

    const output = await useCase.execute({ id: id.id })

    expect(output.parlamentarId).toBe(id.id)
    expect(output.nome).toBe('João da Silva')
    expect(output.partido.sigla).toBe('PT')
  })

  it('should throw NotFoundError when parlamentar does not exist', async () => {
    setup()
    const id = new ParlamentarId()

    await expect(useCase.execute({ id: id.id })).rejects.toThrow(NotFoundError)
  })
})
