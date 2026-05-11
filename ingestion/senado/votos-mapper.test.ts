import { describe, expect, it } from 'vitest'

import { mapTipoVotoSenado } from './votos-mapper'

describe('mapTipoVotoSenado', () => {
  it('mapeia variações canônicas', () => {
    expect(mapTipoVotoSenado('Sim')).toBe('SIM')
    expect(mapTipoVotoSenado('Não')).toBe('NAO')
    expect(mapTipoVotoSenado('Abstenção')).toBe('ABSTENCAO')
    expect(mapTipoVotoSenado('Obstrução')).toBe('OBSTRUCAO')
  })

  it('mapeia siglas específicas do Senado para AUSENTE', () => {
    expect(mapTipoVotoSenado('LS')).toBe('AUSENTE') // licença saúde
    expect(mapTipoVotoSenado('LP')).toBe('AUSENTE') // licença particular
    expect(mapTipoVotoSenado('AP')).toBe('AUSENTE') // atividade parlamentar
    expect(mapTipoVotoSenado('MIS')).toBe('AUSENTE') // missão
    expect(mapTipoVotoSenado('NA')).toBe('AUSENTE')
    expect(mapTipoVotoSenado('NCom')).toBe('AUSENTE') // não comparece
    expect(mapTipoVotoSenado('Pres')).toBe('AUSENTE') // presidente em exercício
  })

  it('reconhece "Presidente (art. 51 RISF)" como AUSENTE via prefixo', () => {
    expect(mapTipoVotoSenado('Presidente (art. 51 RISF)')).toBe('AUSENTE')
  })

  it('"Votou" (votação secreta sem direção) é ABSTENCAO', () => {
    expect(mapTipoVotoSenado('Votou')).toBe('ABSTENCAO')
  })

  it('"P-NRV" (presente, não registrou voto) é ABSTENCAO, não AUSENTE', () => {
    expect(mapTipoVotoSenado('P-NRV')).toBe('ABSTENCAO')
  })

  it('é case/acento-insensitive', () => {
    expect(mapTipoVotoSenado('  nao  ')).toBe('NAO')
    expect(mapTipoVotoSenado('ABS')).toBe('ABSTENCAO')
  })

  it('retorna null para siglas desconhecidas', () => {
    expect(mapTipoVotoSenado('XYZ')).toBeNull()
    expect(mapTipoVotoSenado('')).toBeNull()
  })
})
