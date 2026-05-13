import { describe, expect, it } from 'vitest'

import { mapOrientacaoVoto } from './orientacoes-mapper'

describe('mapOrientacaoVoto', () => {
  it('mapeia variações canônicas observadas em prod', () => {
    expect(mapOrientacaoVoto('Sim')).toBe('SIM')
    expect(mapOrientacaoVoto('Não')).toBe('NAO')
    expect(mapOrientacaoVoto('Liberado')).toBe('LIBERADO')
    expect(mapOrientacaoVoto('Obstrução')).toBe('OBSTRUCAO')
  })

  it('é case-insensitive e tolera acentos ausentes', () => {
    expect(mapOrientacaoVoto('SIM')).toBe('SIM')
    expect(mapOrientacaoVoto('nao')).toBe('NAO')
    expect(mapOrientacaoVoto('LIBERADO')).toBe('LIBERADO')
    expect(mapOrientacaoVoto('obstrucao')).toBe('OBSTRUCAO')
  })

  it('tolera espaços em branco extras', () => {
    expect(mapOrientacaoVoto('  Sim  ')).toBe('SIM')
    expect(mapOrientacaoVoto('  Não  ')).toBe('NAO')
  })

  it('aceita abreviações S/N', () => {
    expect(mapOrientacaoVoto('S')).toBe('SIM')
    expect(mapOrientacaoVoto('N')).toBe('NAO')
  })

  it('retorna null para entrada vazia ou nula (skip silencioso)', () => {
    expect(mapOrientacaoVoto('')).toBeNull()
    expect(mapOrientacaoVoto('   ')).toBeNull()
    expect(mapOrientacaoVoto(null)).toBeNull()
    expect(mapOrientacaoVoto(undefined)).toBeNull()
  })

  it('retorna null para valores desconhecidos (caller decide warn)', () => {
    expect(mapOrientacaoVoto('???')).toBeNull()
    expect(mapOrientacaoVoto('Talvez')).toBeNull()
    expect(mapOrientacaoVoto('Abstenção')).toBeNull()
  })
})
