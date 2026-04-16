import { describe, expect, it } from 'vitest'
import { EntityValidationError } from '@/core/shared/domain/errors/validation.error'
import { ParlamentarInMemoryRepository } from '../../../../infra/db/in-memory/parlamentar-in-memory.repository'
import { SyncParlamentarUseCase } from '../sync-parlamentar.use-case'

describe('SyncParlamentarUseCase', () => {
  let repo: ParlamentarInMemoryRepository
  let useCase: SyncParlamentarUseCase

  function setup() {
    repo = new ParlamentarInMemoryRepository()
    useCase = new SyncParlamentarUseCase(repo)
  }

  const validInput = {
    idExterno: '12345',
    nome: 'João da Silva',
    uf: 'SP',
    partidoSigla: 'PT',
    partidoNome: 'Partido dos Trabalhadores',
    casa: 'CAMARA' as const,
    sourceUrl: 'https://dadosabertos.camara.leg.br',
  }

  it('should create a new parlamentar when not found', async () => {
    setup()
    const output = await useCase.execute(validInput)

    expect(output.idExterno).toBe('12345')
    expect(output.nome).toBe('João da Silva')
    expect(output.partido.sigla).toBe('PT')
    expect(repo.items).toHaveLength(1)
  })

  it('should update existing parlamentar when found by idExterno', async () => {
    setup()
    await useCase.execute(validInput)

    const output = await useCase.execute({
      ...validInput,
      partidoSigla: 'PL',
      partidoNome: 'Partido Liberal',
    })

    expect(output.partido.sigla).toBe('PL')
    expect(output.partido.nome).toBe('Partido Liberal')
    expect(repo.items).toHaveLength(1) // Still only 1 entity
  })

  it('should throw validation error for invalid data', async () => {
    setup()
    await expect(
      useCase.execute({
        ...validInput,
        nome: '',
        uf: 'X',
      }),
    ).rejects.toThrow(EntityValidationError)
  })
})
