import { describe, expect, it } from 'vitest'

import {
  mapSiglaSenado,
  mapSituacaoFromTramitando,
  parseIdentificacao,
} from './proposicoes-mapper'

describe('mapSiglaSenado', () => {
  it('mapeia siglas comuns', () => {
    expect(mapSiglaSenado('PL')).toBe('PL')
    expect(mapSiglaSenado('PEC')).toBe('PEC')
    expect(mapSiglaSenado('PLP')).toBe('PLP')
    expect(mapSiglaSenado('MPV')).toBe('MPV')
  })

  it('unifica PLS e PLC com seus equivalentes', () => {
    // PLS = Projeto de Lei do Senado (legacy, unificado em PL desde 2019)
    expect(mapSiglaSenado('PLS')).toBe('PL')
    // PLC = Projeto de Lei da Câmara em tramitação no Senado
    expect(mapSiglaSenado('PLC')).toBe('PLP')
  })

  it('PDL/PDS mapeiam para PDC', () => {
    expect(mapSiglaSenado('PDL')).toBe('PDC')
    expect(mapSiglaSenado('PDS')).toBe('PDC')
  })

  it('PRS mapeia para PRC', () => {
    expect(mapSiglaSenado('PRS')).toBe('PRC')
  })

  it('retorna null para siglas fora do enum', () => {
    expect(mapSiglaSenado('REQ')).toBeNull()
    expect(mapSiglaSenado('OF')).toBeNull()
  })

  it('é case-insensitive e tolera espaços', () => {
    expect(mapSiglaSenado('  pec  ')).toBe('PEC')
    expect(mapSiglaSenado('Plp')).toBe('PLP')
  })
})

describe('parseIdentificacao', () => {
  it('parsa formato canônico "SIGLA NUM/ANO"', () => {
    expect(parseIdentificacao('PL 1234/2025')).toEqual({
      sigla: 'PL',
      numero: 1234,
      ano: 2025,
    })
    expect(parseIdentificacao('PEC 6/2026')).toEqual({
      sigla: 'PEC',
      numero: 6,
      ano: 2026,
    })
  })

  it('aceita MPV reeditada ("MPV 2189-49/2001") usando o número base', () => {
    expect(parseIdentificacao('MPV 2189-49/2001')).toEqual({
      sigla: 'MPV',
      numero: 2189,
      ano: 2001,
    })
  })

  it('aceita sufixo alfabético ("PL 1234A/2025")', () => {
    expect(parseIdentificacao('PL 1234A/2025')).toEqual({
      sigla: 'PL',
      numero: 1234,
      ano: 2025,
    })
  })

  it('aceita anotações entre parênteses ("PL 6547/2019 (Substitutivo-CD)")', () => {
    expect(parseIdentificacao('PL 6547/2019 (Substitutivo-CD)')).toEqual({
      sigla: 'PL',
      numero: 6547,
      ano: 2019,
    })
  })

  it('aceita anotação após hífen ("REQ 54/2019 - CRE")', () => {
    expect(parseIdentificacao('REQ 54/2019 - CRE')).toEqual({
      sigla: 'REQ',
      numero: 54,
      ano: 2019,
    })
  })

  it('aceita sigla com ponto ("R.S 1/2019")', () => {
    expect(parseIdentificacao('R.S 1/2019')).toEqual({
      sigla: 'R.S',
      numero: 1,
      ano: 2019,
    })
  })

  it('retorna null para formatos inesperados', () => {
    expect(parseIdentificacao('PL-1234/2025')).toBeNull()
    expect(parseIdentificacao('PL 1234')).toBeNull()
    expect(parseIdentificacao('1234/2025')).toBeNull()
    expect(parseIdentificacao('')).toBeNull()
  })
})

describe('mapSituacaoFromTramitando', () => {
  it('"Sim" → TRAMITANDO; "Não" → ARQUIVADA', () => {
    expect(mapSituacaoFromTramitando('Sim')).toBe('TRAMITANDO')
    expect(mapSituacaoFromTramitando('sim')).toBe('TRAMITANDO')
    expect(mapSituacaoFromTramitando('Não')).toBe('ARQUIVADA')
    expect(mapSituacaoFromTramitando('NÃO')).toBe('ARQUIVADA')
  })
})
