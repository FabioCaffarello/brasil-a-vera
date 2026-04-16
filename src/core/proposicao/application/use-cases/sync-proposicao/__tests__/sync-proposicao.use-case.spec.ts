import { describe, expect, it } from 'vitest'
import { ProposicaoInMemoryRepository } from '../../../../infra/db/in-memory/proposicao-in-memory.repository'
import { SyncProposicaoUseCase } from '../sync-proposicao.use-case'

describe('SyncProposicaoUseCase', () => {
  let repo: ProposicaoInMemoryRepository
  let useCase: SyncProposicaoUseCase

  function setup() {
    repo = new ProposicaoInMemoryRepository()
    useCase = new SyncProposicaoUseCase(repo)
  }

  const validInput = {
    idExterno: 'camara-12345',
    casa: 'CAMARA' as const,
    tipo: 'PL' as const,
    numero: 1234,
    ano: 2025,
    ementa: 'Dispõe sobre algo importante',
    dataApresentacao: '2025-03-10',
    autores: ['Fulano'],
    temas: [{ codigoOficial: 40, nome: 'Educação' }],
    situacao: 'TRAMITANDO' as const,
    sourceUrl: 'https://dadosabertos.camara.leg.br',
  }

  it('should create a new proposicao when not found by idExterno', async () => {
    setup()
    const output = await useCase.execute(validInput)

    expect(output.idExterno).toBe('camara-12345')
    expect(output.tipo).toBe('PL')
    expect(output.situacao).toBe('TRAMITANDO')
    expect(repo.items).toHaveLength(1)
  })

  it('should update existing proposicao when same idExterno', async () => {
    setup()
    await useCase.execute(validInput)
    await useCase.execute({
      ...validInput,
      situacao: 'APROVADA',
      situacaoDescricao: 'Aprovada',
      autores: ['Fulano', 'Beltrano'],
      temas: [{ codigoOficial: 100, nome: 'Saúde' }],
    })

    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].situacao).toBe('APROVADA')
    expect(repo.items[0].autores).toEqual(['Fulano', 'Beltrano'])
    expect(repo.items[0].temas[0].nome).toBe('Saúde')
  })

  it('should create different proposicoes for different idExterno', async () => {
    setup()
    await useCase.execute(validInput)
    await useCase.execute({
      ...validInput,
      idExterno: 'senado-99',
      casa: 'SENADO',
    })

    expect(repo.items).toHaveLength(2)
  })

  it('should throw EntityValidationError on invalid input', async () => {
    setup()
    await expect(
      useCase.execute({ ...validInput, idExterno: '', ementa: '' }),
    ).rejects.toThrow()
  })
})
