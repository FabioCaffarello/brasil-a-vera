import { describe, expect, it } from 'vitest'
import { VotacaoInMemoryRepository } from '../../../../infra/db/in-memory/votacao-in-memory.repository'
import type { SyncVotacaoInput } from '../sync-votacao.use-case'
import { SyncVotacaoUseCase } from '../sync-votacao.use-case'

describe('SyncVotacaoUseCase', () => {
  const validInput: SyncVotacaoInput = {
    idExterno: '54321',
    proposicaoIdExterno: '12345',
    dataHora: new Date('2024-06-15T14:00:00Z'),
    descricao: 'PL 1234/2024',
    orgao: 'Plenário',
    votosSim: 300,
    votosNao: 100,
    abstencoes: 10,
    ausentes: 20,
    aprovada: true,
    sourceUrl: 'https://dadosabertos.camara.leg.br',
  }

  it('should create a new votacao', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new SyncVotacaoUseCase(repo)
    const output = await useCase.execute(validInput)

    expect(output.idExterno).toBe('54321')
    expect(output.descricao).toBe('PL 1234/2024')
    expect(output.resultado.aprovada).toBe(true)
    expect(repo.items).toHaveLength(1)
  })

  it('should update existing votacao by idExterno', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new SyncVotacaoUseCase(repo)
    await useCase.execute(validInput)
    await useCase.execute({ ...validInput })

    expect(repo.items).toHaveLength(1)
  })

  it('should throw validation error for invalid data', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new SyncVotacaoUseCase(repo)
    await expect(
      useCase.execute({ ...validInput, descricao: '', orgao: '' }),
    ).rejects.toThrow()
  })

  it('should create votacao with votos nominais', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new SyncVotacaoUseCase(repo)

    const output = await useCase.execute({
      ...validInput,
      votos: [
        {
          parlamentarIdExterno: '1001',
          tipoVoto: 'SIM',
          dataHora: new Date('2024-06-15T14:00:00Z'),
        },
        {
          parlamentarIdExterno: '1002',
          tipoVoto: 'NAO',
          dataHora: null,
        },
      ],
    })

    expect(output.idExterno).toBe('54321')
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].votos).toHaveLength(2)
    expect(repo.items[0].votos[0].parlamentarIdExterno).toBe('1001')
    expect(repo.items[0].votos[0].tipoVoto).toBe('SIM')
    expect(repo.items[0].votos[1].parlamentarIdExterno).toBe('1002')
    expect(repo.items[0].votos[1].tipoVoto).toBe('NAO')
  })

  it('should create votacao with orientacoes de bancada', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new SyncVotacaoUseCase(repo)

    const output = await useCase.execute({
      ...validInput,
      orientacoes: [
        { partidoSigla: 'PT', orientacao: 'SIM' },
        { partidoSigla: 'PL', orientacao: 'NAO' },
        { partidoSigla: 'MDB', orientacao: 'LIBERADO' },
      ],
    })

    expect(output.idExterno).toBe('54321')
    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].orientacoes).toHaveLength(3)
    expect(repo.items[0].orientacoes[0].partidoSigla).toBe('PT')
    expect(repo.items[0].orientacoes[0].orientacao).toBe('SIM')
  })

  it('should create votacao with both votos and orientacoes', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new SyncVotacaoUseCase(repo)

    await useCase.execute({
      ...validInput,
      votos: [
        {
          parlamentarIdExterno: '1001',
          tipoVoto: 'SIM',
          dataHora: new Date('2024-06-15T14:00:00Z'),
        },
      ],
      orientacoes: [{ partidoSigla: 'PT', orientacao: 'SIM' }],
    })

    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].votos).toHaveLength(1)
    expect(repo.items[0].orientacoes).toHaveLength(1)
  })

  it('should work without votos or orientacoes (backwards compatible)', async () => {
    const repo = new VotacaoInMemoryRepository()
    const useCase = new SyncVotacaoUseCase(repo)

    await useCase.execute(validInput)

    expect(repo.items).toHaveLength(1)
    expect(repo.items[0].votos).toHaveLength(0)
    expect(repo.items[0].orientacoes).toHaveLength(0)
  })
})
