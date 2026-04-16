import { describe, expect, it } from 'vitest'
import { GastoInMemoryRepository } from '../../../../infra/db/in-memory/gasto-in-memory.repository'
import { SyncGastoUseCase } from '../sync-gasto.use-case'

describe('SyncGastoUseCase', () => {
  let repo: GastoInMemoryRepository
  let useCase: SyncGastoUseCase

  function setup() {
    repo = new GastoInMemoryRepository()
    useCase = new SyncGastoUseCase(repo)
  }

  const validInput = {
    parlamentarIdExterno: '12345',
    ano: 2025,
    mes: 3,
    tipoDespesa: 'MANUTENÇÃO DE ESCRITÓRIO',
    codDocumento: 100001,
    tipoDocumento: 'Nota Fiscal',
    dataDocumento: '2025-03-15',
    numDocumento: 'NF-001',
    valorDocumento: 1500.0,
    urlDocumento: 'https://example.com/doc.pdf',
    nomeFornecedor: 'Empresa XYZ',
    cnpjCpfFornecedor: '12345678000190',
    valorLiquido: 1500.0,
    valorGlosa: 0,
    sourceUrl: 'https://dadosabertos.camara.leg.br',
  }

  it('should create a new gasto when not found by codDocumento', async () => {
    setup()
    const output = await useCase.execute(validInput)

    expect(output.parlamentarIdExterno).toBe('12345')
    expect(output.codDocumento).toBe(100001)
    expect(output.valorDocumento).toBe(1500.0)
    expect(repo.items).toHaveLength(1)
  })

  it('should not duplicate when same codDocumento exists', async () => {
    setup()
    await useCase.execute(validInput)
    await useCase.execute(validInput)

    expect(repo.items).toHaveLength(1)
  })

  it('should create different gastos for different codDocumento', async () => {
    setup()
    await useCase.execute(validInput)
    await useCase.execute({ ...validInput, codDocumento: 100002 })

    expect(repo.items).toHaveLength(2)
  })
})
