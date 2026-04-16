import { describe, expect, it, vi } from 'vitest'

// Mock logger before importing the module under test
vi.mock('../../shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '../../shared/logger'
import {
  extractIdFromUri,
  mapDespesaToGastoCommand,
  mapTipoOrientacao,
  mapTipoVoto,
  mapTituloToTipoParticipacao,
} from '../camara-mapping'
import type { CamaraDespesa } from '../camara-types'

describe('mapTipoVoto', () => {
  it.each([
    ['Sim', 'SIM'],
    ['Não', 'NAO'],
    ['Abstenção', 'ABSTENCAO'],
    ['Obstrução', 'OBSTRUCAO'],
  ] as const)('should map "%s" to "%s"', (input, expected) => {
    expect(mapTipoVoto(input)).toBe(expected)
  })

  it('should trim whitespace before mapping', () => {
    expect(mapTipoVoto('  Sim  ')).toBe('SIM')
    expect(mapTipoVoto(' Não ')).toBe('NAO')
  })

  it('should return AUSENTE for unknown values and log warning', () => {
    expect(mapTipoVoto('Art. 17')).toBe('AUSENTE')
    expect(logger.warn).toHaveBeenCalledWith(
      'Tipo de voto não mapeado, usando AUSENTE',
      { tipoVoto: 'Art. 17' },
    )
  })

  it('should return AUSENTE for P-NRV', () => {
    expect(mapTipoVoto('P-NRV')).toBe('AUSENTE')
  })

  it('should return AUSENTE for empty string', () => {
    expect(mapTipoVoto('')).toBe('AUSENTE')
  })
})

describe('mapTipoOrientacao', () => {
  it.each([
    ['Sim', 'SIM'],
    ['Não', 'NAO'],
    ['Liberado', 'LIBERADO'],
    ['Obstrução', 'OBSTRUCAO'],
  ] as const)('should map "%s" to "%s"', (input, expected) => {
    expect(mapTipoOrientacao(input)).toBe(expected)
  })

  it('should trim whitespace before mapping', () => {
    expect(mapTipoOrientacao('  Liberado  ')).toBe('LIBERADO')
  })

  it('should return null for unknown values and log warning', () => {
    expect(mapTipoOrientacao('Desconhecido')).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith('Tipo de orientação não mapeado', {
      orientacao: 'Desconhecido',
    })
  })

  it('should return null for empty string', () => {
    expect(mapTipoOrientacao('')).toBeNull()
  })
})

describe('extractIdFromUri', () => {
  it('should extract ID from a standard Câmara API URI', () => {
    expect(
      extractIdFromUri(
        'https://dadosabertos.camara.leg.br/api/v2/proposicoes/12345',
      ),
    ).toBe('12345')
  })

  it('should extract ID from deputados URI', () => {
    expect(
      extractIdFromUri(
        'https://dadosabertos.camara.leg.br/api/v2/deputados/204521',
      ),
    ).toBe('204521')
  })

  it('should return null for null input', () => {
    expect(extractIdFromUri(null)).toBeNull()
  })

  it('should return null for undefined input', () => {
    expect(extractIdFromUri(undefined)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(extractIdFromUri('')).toBeNull()
  })

  it('should handle URI with trailing slash', () => {
    expect(
      extractIdFromUri(
        'https://dadosabertos.camara.leg.br/api/v2/proposicoes/12345/',
      ),
    ).toBe('12345')
  })

  it('should handle simple path', () => {
    expect(extractIdFromUri('/api/v2/votacoes/999')).toBe('999')
  })
})

describe('mapTituloToTipoParticipacao', () => {
  it('should map "Titular" to TITULAR', () => {
    expect(mapTituloToTipoParticipacao('Titular')).toBe('TITULAR')
  })

  it('should map "Suplente" to SUPLENTE', () => {
    expect(mapTituloToTipoParticipacao('Suplente')).toBe('SUPLENTE')
  })

  it.each([
    'Presidente',
    '1º Vice-Presidente',
    '2º Vice-Presidente',
    '3º Vice-Presidente',
  ])('should map "%s" to PRESIDENTE', (titulo) => {
    expect(mapTituloToTipoParticipacao(titulo)).toBe('PRESIDENTE')
  })

  it('should default to TITULAR for unknown titles', () => {
    expect(mapTituloToTipoParticipacao('Relator')).toBe('TITULAR')
    expect(mapTituloToTipoParticipacao('Membro')).toBe('TITULAR')
  })
})

describe('mapDespesaToGastoCommand', () => {
  const fakeDespesa: CamaraDespesa = {
    ano: 2025,
    mes: 3,
    tipoDespesa: 'MANUTENÇÃO DE ESCRITÓRIO',
    codDocumento: 100001,
    tipoDocumento: 'Nota Fiscal',
    codTipoDocumento: 0,
    dataDocumento: '2025-03-15',
    numDocumento: 'NF-001',
    valorDocumento: 1500.0,
    urlDocumento: 'https://example.com/doc.pdf',
    nomeFornecedor: 'Empresa XYZ',
    cnpjCpfFornecedor: '12345678000190',
    valorLiquido: 1500.0,
    valorGlosa: 0,
    numRessarcimento: '',
    codLote: 0,
    parcela: 0,
  }

  it('should map CamaraDespesa to GastoCreateCommand', () => {
    const command = mapDespesaToGastoCommand(fakeDespesa, '12345')

    expect(command.parlamentarIdExterno).toBe('12345')
    expect(command.ano).toBe(2025)
    expect(command.mes).toBe(3)
    expect(command.codDocumento).toBe(100001)
    expect(command.valorDocumento).toBe(1500.0)
    expect(command.dataDocumento).toBe('2025-03-15')
    expect(command.sourceUrl).toContain('12345')
  })

  it('should handle empty dataDocumento', () => {
    const command = mapDespesaToGastoCommand(
      { ...fakeDespesa, dataDocumento: '' },
      '12345',
    )
    expect(command.dataDocumento).toBeNull()
  })

  it('should handle empty urlDocumento', () => {
    const command = mapDespesaToGastoCommand(
      { ...fakeDespesa, urlDocumento: '' },
      '12345',
    )
    expect(command.urlDocumento).toBe('')
  })
})
