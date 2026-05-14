import { describe, expect, it } from 'vitest'

import {
  ALINHAMENTO_AMOSTRA_MINIMA,
  calcularAlinhamento,
  classifyAlinhamento,
} from './alinhamento'

describe('classifyAlinhamento', () => {
  it('LIBERADO sempre IGNORADO', () => {
    expect(classifyAlinhamento('SIM', 'LIBERADO')).toBe('IGNORADO')
    expect(classifyAlinhamento('NAO', 'LIBERADO')).toBe('IGNORADO')
    expect(classifyAlinhamento('AUSENTE', 'LIBERADO')).toBe('IGNORADO')
  })

  it('AUSENTE sempre IGNORADO (parlamentar não participou)', () => {
    expect(classifyAlinhamento('AUSENTE', 'SIM')).toBe('IGNORADO')
    expect(classifyAlinhamento('AUSENTE', 'NAO')).toBe('IGNORADO')
    expect(classifyAlinhamento('AUSENTE', 'OBSTRUCAO')).toBe('IGNORADO')
  })

  it('voto igual à orientação → ALINHADO', () => {
    expect(classifyAlinhamento('SIM', 'SIM')).toBe('ALINHADO')
    expect(classifyAlinhamento('NAO', 'NAO')).toBe('ALINHADO')
    expect(classifyAlinhamento('OBSTRUCAO', 'OBSTRUCAO')).toBe('ALINHADO')
  })

  it('voto diferente da orientação → DIVERGENTE', () => {
    expect(classifyAlinhamento('SIM', 'NAO')).toBe('DIVERGENTE')
    expect(classifyAlinhamento('NAO', 'SIM')).toBe('DIVERGENTE')
    expect(classifyAlinhamento('ABSTENCAO', 'SIM')).toBe('DIVERGENTE')
    expect(classifyAlinhamento('ABSTENCAO', 'NAO')).toBe('DIVERGENTE')
    expect(classifyAlinhamento('OBSTRUCAO', 'SIM')).toBe('DIVERGENTE')
    expect(classifyAlinhamento('SIM', 'OBSTRUCAO')).toBe('DIVERGENTE')
  })
})

describe('calcularAlinhamento', () => {
  it('retorna percentual null quando total = 0', () => {
    expect(calcularAlinhamento([])).toEqual({
      total: 0,
      alinhados: 0,
      divergentes: 0,
      percentual: null,
    })
  })

  it('só LIBERADO/AUSENTE → percentual null', () => {
    const stats = calcularAlinhamento([
      { voto: 'SIM', orientacao: 'LIBERADO' },
      { voto: 'AUSENTE', orientacao: 'SIM' },
    ])
    expect(stats).toEqual({
      total: 0,
      alinhados: 0,
      divergentes: 0,
      percentual: null,
    })
  })

  it('100% alinhado', () => {
    const stats = calcularAlinhamento([
      { voto: 'SIM', orientacao: 'SIM' },
      { voto: 'NAO', orientacao: 'NAO' },
      { voto: 'OBSTRUCAO', orientacao: 'OBSTRUCAO' },
    ])
    expect(stats.percentual).toBe(100)
    expect(stats.alinhados).toBe(3)
    expect(stats.divergentes).toBe(0)
    expect(stats.total).toBe(3)
  })

  it('50% alinhado', () => {
    const stats = calcularAlinhamento([
      { voto: 'SIM', orientacao: 'SIM' },
      { voto: 'SIM', orientacao: 'NAO' },
      { voto: 'NAO', orientacao: 'NAO' },
      { voto: 'NAO', orientacao: 'SIM' },
    ])
    expect(stats.percentual).toBe(50)
    expect(stats.alinhados).toBe(2)
    expect(stats.divergentes).toBe(2)
    expect(stats.total).toBe(4)
  })

  it('0% alinhado', () => {
    const stats = calcularAlinhamento([
      { voto: 'NAO', orientacao: 'SIM' },
      { voto: 'SIM', orientacao: 'NAO' },
    ])
    expect(stats.percentual).toBe(0)
    expect(stats.alinhados).toBe(0)
    expect(stats.divergentes).toBe(2)
  })

  it('mistura ignora LIBERADO e AUSENTE no denominador', () => {
    const stats = calcularAlinhamento([
      { voto: 'SIM', orientacao: 'SIM' }, // ALINHADO
      { voto: 'NAO', orientacao: 'SIM' }, // DIVERGENTE
      { voto: 'SIM', orientacao: 'LIBERADO' }, // IGNORADO
      { voto: 'AUSENTE', orientacao: 'NAO' }, // IGNORADO
    ])
    expect(stats.total).toBe(2)
    expect(stats.alinhados).toBe(1)
    expect(stats.divergentes).toBe(1)
    expect(stats.percentual).toBe(50)
  })

  it('arredonda percentual', () => {
    // 1 alinhado / 3 total = 33.33% → arredonda pra 33
    const stats = calcularAlinhamento([
      { voto: 'SIM', orientacao: 'SIM' },
      { voto: 'SIM', orientacao: 'NAO' },
      { voto: 'SIM', orientacao: 'NAO' },
    ])
    expect(stats.percentual).toBe(33)
  })

  it('ALINHAMENTO_AMOSTRA_MINIMA = 50 (issue #46)', () => {
    expect(ALINHAMENTO_AMOSTRA_MINIMA).toBe(50)
  })
})
