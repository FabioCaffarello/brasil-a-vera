import { describe, expect, it } from 'vitest'

import { mapTipoVoto } from './votos-mapper'

describe('mapTipoVoto', () => {
  it('mapeia variações canônicas em PT-BR', () => {
    expect(mapTipoVoto('Sim')).toBe('SIM')
    expect(mapTipoVoto('Não')).toBe('NAO')
    expect(mapTipoVoto('Abstenção')).toBe('ABSTENCAO')
    expect(mapTipoVoto('Obstrução')).toBe('OBSTRUCAO')
    expect(mapTipoVoto('Ausente')).toBe('AUSENTE')
  })

  it('é case-insensitive e tolera acentos ausentes', () => {
    expect(mapTipoVoto('SIM')).toBe('SIM')
    expect(mapTipoVoto('nao')).toBe('NAO')
    expect(mapTipoVoto('  Não  ')).toBe('NAO')
    expect(mapTipoVoto('ABSTENCAO')).toBe('ABSTENCAO')
  })

  it('aceita abreviações S/N', () => {
    expect(mapTipoVoto('S')).toBe('SIM')
    expect(mapTipoVoto('N')).toBe('NAO')
  })

  it('mapeia "Artigo 17" (licença regimental) para AUSENTE', () => {
    expect(mapTipoVoto('Artigo 17')).toBe('AUSENTE')
    expect(mapTipoVoto('artigo 17')).toBe('AUSENTE')
  })

  it('retorna null para valores desconhecidos', () => {
    expect(mapTipoVoto('???')).toBeNull()
    expect(mapTipoVoto('Liberado')).toBeNull()
  })
})
