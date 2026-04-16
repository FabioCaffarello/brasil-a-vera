import { describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '../../shared/logger'
import {
  ensureArray,
  mapDescricaoParticipacao,
  mapSenadoResultado,
  mapSenadorToParlamentarCommand,
  mapSenadoVoto,
  mapVotacaoSenadoToCommand,
  parseIntSafe,
  parseSenadoDate,
  parseSenadoDateTime,
} from '../senado-mapping'
import type { SenadoParlamentarResumo, SenadoVotacao } from '../senado-types'

describe('ensureArray', () => {
  it('should return array as-is', () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('should wrap single object in array', () => {
    expect(ensureArray({ id: 1 })).toEqual([{ id: 1 }])
  })

  it('should return empty array for null', () => {
    expect(ensureArray(null)).toEqual([])
  })

  it('should return empty array for undefined', () => {
    expect(ensureArray(undefined)).toEqual([])
  })

  it('should return empty array for empty array', () => {
    expect(ensureArray([])).toEqual([])
  })

  it('should NOT iterate string characters when string is single value', () => {
    expect(ensureArray('hello')).toEqual(['hello'])
  })
})

describe('mapSenadoVoto', () => {
  it.each([
    ['Sim', 'SIM'],
    ['Não', 'NAO'],
    ['Abstenção', 'ABSTENCAO'],
    ['Obstrução', 'OBSTRUCAO'],
  ] as const)('should map "%s" to "%s"', (input, expected) => {
    expect(mapSenadoVoto(input)).toBe(expected)
  })

  it.each([
    'P-NRV',
    'MIS',
    'NCom',
    'LP',
    'AP',
    'LS',
  ])('should map "%s" to AUSENTE', (input) => {
    expect(mapSenadoVoto(input)).toBe('AUSENTE')
  })

  it('should map "Votou" (votação secreta) to AUSENTE without warning', () => {
    const warnSpy = vi.mocked(logger.warn)
    warnSpy.mockClear()
    expect(mapSenadoVoto('Votou')).toBe('AUSENTE')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('should map "Presidente (art. 51 RISF)" to AUSENTE', () => {
    expect(mapSenadoVoto('Presidente (art. 51 RISF)')).toBe('AUSENTE')
  })

  it('should trim whitespace', () => {
    expect(mapSenadoVoto('  Sim  ')).toBe('SIM')
  })

  it('should return AUSENTE for unknown values and log warning', () => {
    expect(mapSenadoVoto('XYZDesconhecido')).toBe('AUSENTE')
    expect(logger.warn).toHaveBeenCalledWith('Voto do Senado não mapeado', {
      voto: 'XYZDesconhecido',
    })
  })
})

describe('mapSenadoResultado', () => {
  it('should return true for "A"', () => {
    expect(mapSenadoResultado('A')).toBe(true)
  })

  it('should return true for "a" (case-insensitive)', () => {
    expect(mapSenadoResultado('a')).toBe(true)
  })

  it('should return false for "R"', () => {
    expect(mapSenadoResultado('R')).toBe(false)
  })

  it('should return false for "P"', () => {
    expect(mapSenadoResultado('P')).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(mapSenadoResultado(undefined)).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(mapSenadoResultado('')).toBe(false)
  })
})

describe('parseSenadoDateTime', () => {
  it('should parse date with HH:MM:SS time', () => {
    const result = parseSenadoDateTime('2025-04-15', '14:30:00')
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(3) // 0-indexed (April)
    expect(result.getDate()).toBe(15)
  })

  it('should parse date with HH:MM time (normalized to HH:MM:00)', () => {
    const result = parseSenadoDateTime('2025-04-15', '14:30')
    expect(result.getFullYear()).toBe(2025)
    expect(Number.isNaN(result.getTime())).toBe(false)
  })

  it('should fallback to 12:00 when horaInicio is null', () => {
    const result = parseSenadoDateTime('2025-04-15', null)
    expect(Number.isNaN(result.getTime())).toBe(false)
    expect(result.getFullYear()).toBe(2025)
  })

  it('should fallback to date-only when datetime is invalid', () => {
    const result = parseSenadoDateTime('2025-04-15', 'lixo')
    expect(Number.isNaN(result.getTime())).toBe(false)
  })
})

describe('parseIntSafe', () => {
  it('should parse valid integer string', () => {
    expect(parseIntSafe('42')).toBe(42)
  })

  it('should return 0 for undefined', () => {
    expect(parseIntSafe(undefined)).toBe(0)
  })

  it('should return 0 for null', () => {
    expect(parseIntSafe(null)).toBe(0)
  })

  it('should return 0 for non-numeric string', () => {
    expect(parseIntSafe('abc')).toBe(0)
  })

  it('should return 0 for empty string', () => {
    expect(parseIntSafe('')).toBe(0)
  })
})

describe('mapSenadorToParlamentarCommand', () => {
  const fakeSenador: SenadoParlamentarResumo = {
    IdentificacaoParlamentar: {
      CodigoParlamentar: '5322',
      NomeParlamentar: 'Romário',
      NomeCompletoParlamentar: 'Romário de Souza Faria',
      SexoParlamentar: 'Masculino',
      UrlFotoParlamentar:
        'http://www.senado.leg.br/senadores/img/fotos-oficiais/senador5322.jpg',
      SiglaPartidoParlamentar: 'PL',
      UfParlamentar: 'RJ',
    },
  }

  it('should prefix idExterno with "senado-"', () => {
    const cmd = mapSenadorToParlamentarCommand(fakeSenador)
    expect(cmd.idExterno).toBe('senado-5322')
  })

  it('should set casa to SENADO', () => {
    const cmd = mapSenadorToParlamentarCommand(fakeSenador)
    expect(cmd.casa).toBe('SENADO')
  })

  it('should set cpf to null (not in lista endpoint)', () => {
    const cmd = mapSenadorToParlamentarCommand(fakeSenador)
    expect(cmd.cpf).toBeNull()
  })

  it('should map all required fields', () => {
    const cmd = mapSenadorToParlamentarCommand(fakeSenador)
    expect(cmd.nome).toBe('Romário')
    expect(cmd.nomeCivil).toBe('Romário de Souza Faria')
    expect(cmd.uf).toBe('RJ')
    expect(cmd.partidoSigla).toBe('PL')
    expect(cmd.partidoNome).toBe('PL')
    expect(cmd.urlFoto).toContain('senador5322.jpg')
    expect(cmd.sourceUrl).toContain('5322')
  })
})

describe('mapVotacaoSenadoToCommand', () => {
  function buildVotacao(overrides: Partial<SenadoVotacao> = {}): SenadoVotacao {
    return {
      CodigoSessao: '450520',
      CodigoSessaoVotacao: '6918',
      SiglaCasa: 'SF',
      DataSessao: '2025-04-15',
      HoraInicio: '14:30:00',
      Secreta: 'N',
      DescricaoVotacao: 'Votação nominal da PEC X',
      Resultado: 'A',
      CodigoMateria: '167182',
      SiglaMateria: 'PEC',
      NumeroMateria: '45',
      AnoMateria: '2019',
      DescricaoIdentificacaoMateria: 'PEC 45/2019',
      Votos: {
        VotoParlamentar: [
          {
            CodigoParlamentar: '22',
            NomeParlamentar: 'Esperidião Amin',
            SiglaPartido: 'PP',
            SiglaUF: 'SC',
            Voto: 'Sim',
          },
          {
            CodigoParlamentar: '70',
            NomeParlamentar: 'Foo Bar',
            SiglaPartido: 'PT',
            SiglaUF: 'SP',
            Voto: 'Não',
          },
          {
            CodigoParlamentar: '99',
            NomeParlamentar: 'Baz',
            SiglaPartido: 'PSDB',
            SiglaUF: 'MG',
            Voto: 'P-NRV',
          },
        ],
      },
      ...overrides,
    }
  }

  it('should prefix idExterno with "senado-"', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao())
    expect(cmd.idExterno).toBe('senado-6918')
  })

  it('should prefix parlamentarIdExterno with "senado-" in votos', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao())
    expect(cmd.votos[0].parlamentarIdExterno).toBe('senado-22')
    expect(cmd.votos[1].parlamentarIdExterno).toBe('senado-70')
  })

  it('should count totals from votos array', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao())
    expect(cmd.votosSim).toBe(1)
    expect(cmd.votosNao).toBe(1)
    expect(cmd.abstencoes).toBe(0)
    expect(cmd.ausentes).toBe(1) // P-NRV
  })

  it('should set aprovada=true for Resultado="A"', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao({ Resultado: 'A' }))
    expect(cmd.aprovada).toBe(true)
  })

  it('should set aprovada=false for Resultado="R"', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao({ Resultado: 'R' }))
    expect(cmd.aprovada).toBe(false)
  })

  it('should set proposicaoIdExterno to CodigoMateria', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao())
    expect(cmd.proposicaoIdExterno).toBe('167182')
  })

  it('should set proposicaoIdExterno to null when CodigoMateria missing', () => {
    const cmd = mapVotacaoSenadoToCommand(
      buildVotacao({ CodigoMateria: undefined }),
    )
    expect(cmd.proposicaoIdExterno).toBeNull()
  })

  it('should handle voto coming as single object (not array)', () => {
    const single = buildVotacao({
      Votos: {
        VotoParlamentar: {
          CodigoParlamentar: '22',
          NomeParlamentar: 'Esperidião Amin',
          SiglaPartido: 'PP',
          SiglaUF: 'SC',
          Voto: 'Sim',
        },
      },
    })
    const cmd = mapVotacaoSenadoToCommand(single)
    expect(cmd.votos).toHaveLength(1)
    expect(cmd.votos[0].parlamentarIdExterno).toBe('senado-22')
  })

  it('should handle votação secreta with empty votos', () => {
    const secreta = buildVotacao({ Secreta: 'S', Votos: undefined })
    const cmd = mapVotacaoSenadoToCommand(secreta)
    expect(cmd.votos).toHaveLength(0)
    expect(cmd.votosSim).toBe(0)
    expect(cmd.orgao).toBe('PLENARIO-SF-SECRETA')
  })

  it('should filter votos and zero counters when Secreta === "S" even if Votos present', () => {
    const secretaComVotou = buildVotacao({
      Secreta: 'S',
      Votos: {
        VotoParlamentar: [
          {
            CodigoParlamentar: '1',
            NomeParlamentar: 'A',
            SiglaPartido: 'X',
            SiglaUF: 'AP',
            Voto: 'Votou',
          },
          {
            CodigoParlamentar: '2',
            NomeParlamentar: 'B',
            SiglaPartido: 'Y',
            SiglaUF: 'BA',
            Voto: 'Votou',
          },
        ],
      },
    })
    const cmd = mapVotacaoSenadoToCommand(secretaComVotou)
    expect(cmd.votos).toEqual([])
    expect(cmd.votosSim).toBe(0)
    expect(cmd.votosNao).toBe(0)
    expect(cmd.abstencoes).toBe(0)
    expect(cmd.ausentes).toBe(0)
    expect(cmd.orgao).toBe('PLENARIO-SF-SECRETA')
  })

  it('should process votos normally when Secreta === "N"', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao({ Secreta: 'N' }))
    expect(cmd.votos).toHaveLength(3)
    expect(cmd.votosSim).toBe(1)
    expect(cmd.votosNao).toBe(1)
    expect(cmd.orgao).toBe('PLENARIO-SF')
  })

  it('should set orgao to PLENARIO-SF for non-secret votations', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao())
    expect(cmd.orgao).toBe('PLENARIO-SF')
  })

  it('should fallback descricao to DescricaoIdentificacaoMateria', () => {
    const cmd = mapVotacaoSenadoToCommand(
      buildVotacao({ DescricaoVotacao: '' }),
    )
    expect(cmd.descricao).toBe('PEC 45/2019')
  })

  it('should set sourceUrl based on data year', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao())
    expect(cmd.sourceUrl).toContain('ListaVotacoes2025.json')
  })

  it('should provide empty orientacoes (Wave 0)', () => {
    const cmd = mapVotacaoSenadoToCommand(buildVotacao())
    expect(cmd.orientacoes).toEqual([])
  })
})

describe('parseSenadoDate', () => {
  it('should parse YYYY-MM-DD (formato real da API)', () => {
    const d = parseSenadoDate('2025-03-15')
    expect(d).not.toBeNull()
    expect(d?.getUTCFullYear()).toBe(2025)
    expect(d?.getUTCMonth()).toBe(2) // March
    expect(d?.getUTCDate()).toBe(15)
  })

  it('should also parse YYYYMMDD (defensiva)', () => {
    const d = parseSenadoDate('20250315')
    expect(d).not.toBeNull()
    expect(d?.getUTCFullYear()).toBe(2025)
    expect(d?.getUTCMonth()).toBe(2)
    expect(d?.getUTCDate()).toBe(15)
  })

  it('should return null for empty string', () => {
    expect(parseSenadoDate('')).toBeNull()
  })

  it('should return null for undefined', () => {
    expect(parseSenadoDate(undefined)).toBeNull()
  })

  it('should return null for invalid format', () => {
    expect(parseSenadoDate('15/03/2025')).toBeNull()
    expect(parseSenadoDate('12345')).toBeNull()
    expect(parseSenadoDate('abcdefgh')).toBeNull()
  })

  it('should trim whitespace before parsing', () => {
    expect(parseSenadoDate('  2025-03-15  ')).not.toBeNull()
    expect(parseSenadoDate('  20250315  ')).not.toBeNull()
  })
})

describe('mapDescricaoParticipacao', () => {
  it.each([
    ['Titular', 'TITULAR'],
    ['TITULAR', 'TITULAR'],
    ['Suplente', 'SUPLENTE'],
    ['SUPLENTE', 'SUPLENTE'],
    ['Presidente', 'PRESIDENTE'],
    ['PRESIDENTE', 'PRESIDENTE'],
    ['Vice-Presidente', 'PRESIDENTE'],
    ['1º Vice-Presidente', 'PRESIDENTE'],
    ['2º Vice-Presidente', 'PRESIDENTE'],
    ['Relator', 'TITULAR'], // fallback
    ['', 'TITULAR'], // edge case
  ] as const)('should map "%s" to %s', (input, expected) => {
    expect(mapDescricaoParticipacao(input)).toBe(expected)
  })

  it('should trim whitespace', () => {
    expect(mapDescricaoParticipacao('  Suplente  ')).toBe('SUPLENTE')
  })
})
